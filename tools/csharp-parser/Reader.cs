using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace AgriMap.Lint.CSharp;

// Package-owned reader: parses caller-supplied text, never loads/builds a target project.
internal static class Reader
{
    // Project/GlobalUsings come from caller-read csproj text only; no project is evaluated.
    private sealed record Input(string Path, string Text, string Profile, string? Project = null, string[]? GlobalUsings = null);
    private sealed record Observation(string DetectorId, string Case, int Line, int Column, string Anchor, string Fingerprint, string Evidence);
    private sealed record Result(string Path, string Status, string[] Diagnostics, List<Observation> Observations);
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    private static readonly HashSet<string> AllowedNamespaces = new(StringComparer.Ordinal)
    {
        "Application", "Application.Interfaces", "Application.UseCases", "Domain.Constants", "Domain.Entities", "Domain.ValueObjects",
        "Infrastructure", "Infrastructure.ExternalService", "Infrastructure.Persistence.Interfaces", "Infrastructure.Persistence.Models", "Infrastructure.Persistence.Repositories",
        "Presentation.Config", "Presentation.Controllers", "Presentation.DTOs.Requests", "Presentation.DTOs.Responses", "Presentation.Filters", "Presentation.Middlewares", "Presentation.Mockup", "Presentation.Models", "Shared.Extensions", "Shared.Helpers"
    };

    private static void Add(List<Observation> output, SyntaxNode node, string detector, string kind, string evidence = "syntax", SyntaxToken? at = null)
    {
        // Chained operators share an operand start, so callers may locate the operator token instead.
        var position = node.SyntaxTree.GetLineSpan(at?.Span ?? node.Span).StartLinePosition;
        var anchor = string.Join(".", node.AncestorsAndSelf().Reverse().Select(n => n switch
        {
            BaseNamespaceDeclarationSyntax ns => NameText(ns.Name),
            BaseTypeDeclarationSyntax type => type.Identifier.ValueText,
            DelegateDeclarationSyntax d => d.Identifier.ValueText,
            MethodDeclarationSyntax m => m.Identifier.ValueText,
            PropertyDeclarationSyntax p => p.Identifier.ValueText,
            EventDeclarationSyntax e => e.Identifier.ValueText,
            EnumMemberDeclarationSyntax e => e.Identifier.ValueText,
            ConstructorDeclarationSyntax c => c.Identifier.ValueText,
            VariableDeclaratorSyntax v => v.Identifier.ValueText,
            _ => ""
        }).Where(s => s.Length > 0));
        // Signature-scoped kinds keep their identity across unrelated body edits.
        var tokens = kind is "member-case" or "async-suffix" or "branch-limit" or "parameter-limit" or "overload-adjacency" or "dispose-suppress-finalize" or "unused-local" ? kind + ":" + (node switch
        {
            MethodDeclarationSyntax m => m.Identifier.ValueText,
            ConstructorDeclarationSyntax c => c.Identifier.ValueText,
            LocalFunctionStatementSyntax l => l.Identifier.ValueText,
            AccessorDeclarationSyntax a => a.Keyword.ValueText,
            ParenthesizedLambdaExpressionSyntax p => p.Kind() + ":" + string.Join("|", p.ParameterList.Parameters.Select(x => x.Identifier.ValueText)),
            SimpleLambdaExpressionSyntax s => s.Kind() + ":" + s.Parameter.Identifier.ValueText,
            AnonymousMethodExpressionSyntax a => a.Kind() + ":" + string.Join("|", a.ParameterList?.Parameters.Select(x => x.Identifier.ValueText) ?? []),
            PropertyDeclarationSyntax p => p.Identifier.ValueText,
            EventDeclarationSyntax e => e.Identifier.ValueText,
            EnumMemberDeclarationSyntax e => e.Identifier.ValueText,
            VariableDeclaratorSyntax v => v.Identifier.ValueText,
            _ => node.Kind().ToString()
        }) : node switch
        {
            BaseNamespaceDeclarationSyntax ns => ns.RawKind + ":" + NameText(ns.Name),
            BaseTypeDeclarationSyntax type => type.RawKind + ":" + string.Join(" ", type.Modifiers.Select(t => t.ValueText)) + ":" + type.Identifier.ValueText,
            _ => string.Join("|", node.DescendantTokens().Select(token => token.RawKind + ":" + token.Text))
        };
        output.Add(new(detector, kind, position.Line + 1, position.Character + 1, Hash(anchor), Hash(tokens), evidence));
    }

    private static bool Has(SyntaxTokenList modifiers, SyntaxKind kind) => modifiers.Any(t => t.IsKind(kind));
    private static string NameText(NameSyntax name) => string.Concat(name.DescendantTokens().Select(t => t.ValueText)).Replace("global::", "", StringComparison.Ordinal);
    private static bool NullLiteral(ExpressionSyntax expression)
    {
        while (expression is ParenthesizedExpressionSyntax parenthesized) expression = parenthesized.Expression;
        return expression.IsKind(SyntaxKind.NullLiteralExpression);
    }
    private static bool CoreType(ITypeSymbol? type, string ns, params string[] names) => type is not null
        && type.TypeKind != TypeKind.Error && type.ContainingNamespace?.ToDisplayString() == ns
        && type.ContainingAssembly?.Name == "System.Private.CoreLib" && names.Contains(type.OriginalDefinition.Name);
    // The member itself must come from the runtime type: a subclass can hide Result/Wait.
    private static bool TaskType(ITypeSymbol? type) => CoreType(type, "System.Threading.Tasks", "Task", "ValueTask");
    private static IParameterSymbol? ParameterSource(SemanticModel model, ExpressionSyntax expression)
    {
        while (expression is ParenthesizedExpressionSyntax parenthesized) expression = parenthesized.Expression;
        if (expression is BinaryExpressionSyntax coalesce && coalesce.IsKind(SyntaxKind.CoalesceExpression) && coalesce.Right is ThrowExpressionSyntax) return ParameterSource(model, coalesce.Left);
        return model.GetSymbolInfo(expression).Symbol as IParameterSymbol;
    }
    // QUALITY-01..03 team limits; Sonar scores and Quality Profile thresholds are never derived here.
    private const int BranchLimit = 7, ParameterLimit = 7;
    // A function body owns its if statements; nested local functions and lambdas are separate scopes.
    private static bool FunctionScope(SyntaxNode node) => node is BaseMethodDeclarationSyntax or AccessorDeclarationSyntax or LocalFunctionStatementSyntax or AnonymousFunctionExpressionSyntax;
    private static SyntaxToken? ScopeToken(SyntaxNode node) => node switch
    {
        MethodDeclarationSyntax m => m.Identifier,
        ConstructorDeclarationSyntax c => c.Identifier,
        DestructorDeclarationSyntax d => d.Identifier,
        OperatorDeclarationSyntax o => o.OperatorToken,
        ConversionOperatorDeclarationSyntax c => c.Type.GetFirstToken(),
        LocalFunctionStatementSyntax l => l.Identifier,
        AccessorDeclarationSyntax a => a.Keyword,
        _ => null
    };
    private static bool NestedTernary(ConditionalExpressionSyntax conditional)
    {
        foreach (var ancestor in conditional.Ancestors())
        {
            if (ancestor is ConditionalExpressionSyntax) return true;
            if (FunctionScope(ancestor) || ancestor is MemberDeclarationSyntax or StatementSyntax) return false;
        }
        return false;
    }
    // QUALITY-05 advisory smells (ADV-*): recommend-first candidates; the reader never weighs whether to fix them.
    private static string Simple(ExpressionSyntax expression) => expression switch
    {
        IdentifierNameSyntax id => id.Identifier.ValueText,
        MemberAccessExpressionSyntax member => member.Name.Identifier.ValueText,
        AliasQualifiedNameSyntax alias => alias.Name.Identifier.ValueText,
        _ => ""
    };
    // Runtime guard APIs whose trailing paramName is [CallerArgumentExpression]; value = arguments before it.
    private static int GuardArity(string owner, string name) => (owner, name) switch
    {
        ("ArgumentNullException", "ThrowIfNull") or ("ArgumentException", "ThrowIfNullOrEmpty" or "ThrowIfNullOrWhiteSpace")
            or ("ArgumentOutOfRangeException", "ThrowIfNegative" or "ThrowIfZero" or "ThrowIfNegativeOrZero") => 1,
        ("ArgumentOutOfRangeException", "ThrowIfEqual" or "ThrowIfNotEqual" or "ThrowIfGreaterThan" or "ThrowIfGreaterThanOrEqual" or "ThrowIfLessThan" or "ThrowIfLessThanOrEqual") => 2,
        _ => 0
    };
    private static bool DisposableName(TypeSyntax type) => type is NameSyntax name && NameText(name) is "IDisposable" or "System.IDisposable";
    private static void AdvisorySmells(CompilationUnitSyntax root, List<Observation> observations)
    {
        // ADV-01 (S4136): same-name methods split by another member; reported once at the first overload.
        foreach (var type in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            foreach (var overloads in type.Members.Select((member, index) => (member, index))
                .Where(x => x.member is MethodDeclarationSyntax { ExplicitInterfaceSpecifier: null })
                .GroupBy(x => ((MethodDeclarationSyntax)x.member).Identifier.ValueText, StringComparer.Ordinal))
            {
                var first = overloads.First();
                if (overloads.Count() > 1 && overloads.Last().index - first.index + 1 != overloads.Count())
                    Add(observations, first.member, "be-overload-adjacency", "overload-adjacency", at: ((MethodDeclarationSyntax)first.member).Identifier);
            }
        // ADV-07 (CA1816): IDisposable.Dispose() on an unsealed class, or one with a finalizer, without GC.SuppressFinalize.
        foreach (var method in root.DescendantNodes().OfType<MethodDeclarationSyntax>())
        {
            if (method.Identifier.ValueText != "Dispose" || method.ParameterList.Parameters.Count > 0 || method.Parent is not ClassDeclarationSyntax owner
                || method.ReturnType is not PredefinedTypeSyntax { Keyword.ValueText: "void" } || owner.BaseList?.Types.Any(t => DisposableName(t.Type)) != true) continue;
            if (method.ExplicitInterfaceSpecifier is { } explicitName ? !DisposableName(explicitName.Name) : !Has(method.Modifiers, SyntaxKind.PublicKeyword)) continue;
            if (Has(owner.Modifiers, SyntaxKind.StaticKeyword) || Has(owner.Modifiers, SyntaxKind.SealedKeyword) && !owner.Members.OfType<DestructorDeclarationSyntax>().Any()) continue;
            var suppressed = method.DescendantNodes().OfType<InvocationExpressionSyntax>().Any(i => i.Expression is MemberAccessExpressionSyntax call
                && call.Name.Identifier.ValueText == "SuppressFinalize" && Simple(call.Expression) == "GC");
            if (!suppressed) Add(observations, method, "be-dispose-suppress-finalize", "dispose-suppress-finalize", at: method.Identifier);
        }
        // ADV-05 (S1481): a declared local never named again in its block; using declarations and _ are excluded.
        foreach (var declaration in root.DescendantNodes().OfType<LocalDeclarationStatementSyntax>())
        {
            if (!declaration.UsingKeyword.IsKind(SyntaxKind.None) || declaration.Parent is null) continue;
            foreach (var variable in declaration.Declaration.Variables)
            {
                var name = variable.Identifier.ValueText;
                if (name == "_" || declaration.Parent.DescendantNodes().OfType<IdentifierNameSyntax>().Any(id => id.Identifier.ValueText == name)) continue;
                Add(observations, variable, "be-unused-local", "unused-local", at: variable.Identifier);
            }
        }
        // ADV-04 (S3236): explicit paramName on a runtime guard whose parameter is filled by CallerArgumentExpression.
        foreach (var invocation in root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is not MemberAccessExpressionSyntax guard) continue;
            var arity = GuardArity(Simple(guard.Expression), guard.Name.Identifier.ValueText);
            var args = invocation.ArgumentList.Arguments;
            var explicitName = args.FirstOrDefault(a => a.NameColon?.Name.Identifier.ValueText == "paramName") ?? (args.Count > arity ? args[arity] : null);
            if (arity > 0 && explicitName is not null) Add(observations, invocation, "be-caller-info-argument", "caller-info-argument", at: explicitName.GetFirstToken());
        }
    }
    private static bool InNameOf(SyntaxNode node) => node.Ancestors().OfType<InvocationExpressionSyntax>().Any(n => n.Expression is IdentifierNameSyntax id && id.Identifier.ValueText == "nameof");

    private static Result Analyze(Input input, SyntaxTree tree, SemanticModel model)
    {
        var root = tree.GetCompilationUnitRoot();
        var observations = new List<Observation>();
        var diagnostics = new List<string>();
        if (root.DescendantTrivia(descendIntoTrivia: true).Any(t => t.GetStructure() is ConditionalDirectiveTriviaSyntax))
            return new(input.Path, "blocked", ["CSHARP_CONDITIONAL_COMPILATION_CONTEXT_REQUIRED"], observations);
        var errors = tree.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error).Select(d => d.Id).Distinct().Order(StringComparer.Ordinal).ToArray();
        if (errors.Length > 0) return new(input.Path, "error", errors, observations);

        var prefix = input.Profile == "agmbo" ? "AgriMap.Worker." : "AgriMap.Web.Service.";
        bool Allowed(string name) => name.StartsWith(prefix, StringComparison.Ordinal)
            && (AllowedNamespaces.Contains(name[prefix.Length..]) || input.Profile == "agmbo" && name[prefix.Length..] == "Infrastructure.Jobs");
        var unscopedType = root.Members.FirstOrDefault(m => m is BaseTypeDeclarationSyntax or DelegateDeclarationSyntax);
        if (unscopedType is not null) Add(observations, unscopedType, "be-namespace-observation", "namespace-missing");
        foreach (var ns in root.DescendantNodes().OfType<BaseNamespaceDeclarationSyntax>())
        {
            var name = string.Join(".", ns.AncestorsAndSelf().OfType<BaseNamespaceDeclarationSyntax>().Reverse().Select(n => NameText(n.Name)));
            if (!Allowed(name) || ns is not FileScopedNamespaceDeclarationSyntax) Add(observations, ns, "be-namespace-observation", "namespace-declaration");
        }
        foreach (var directive in root.DescendantNodes().OfType<UsingDirectiveSyntax>())
        {
            if (directive.Alias is not null || !directive.StaticKeyword.IsKind(SyntaxKind.None)) continue;
            var name = directive.Name is null ? "" : NameText(directive.Name);
            if (name.StartsWith(prefix, StringComparison.Ordinal) && !Allowed(name)) Add(observations, directive, "be-namespace-observation", "namespace-reference");
        }
        var publicTypes = root.DescendantNodes().OfType<MemberDeclarationSyntax>().Where(n => n switch
        {
            BaseTypeDeclarationSyntax t => Has(t.Modifiers, SyntaxKind.PublicKeyword),
            DelegateDeclarationSyntax d => Has(d.Modifiers, SyntaxKind.PublicKeyword),
            _ => false
        }).ToList();
        foreach (var extra in publicTypes.Skip(1)) Add(observations, extra, "be-public-type-count", "multiple-public-types");
        foreach (var declaration in root.DescendantNodes().OfType<DelegateDeclarationSyntax>())
            if (declaration.Identifier.ValueText.Length > 0 && (!char.IsUpper(declaration.Identifier.ValueText[0]) || declaration.Identifier.ValueText.Contains('_'))) Add(observations, declaration, "be-type-naming", "type-case");
        foreach (var type in root.DescendantNodes().OfType<BaseTypeDeclarationSyntax>())
        {
            var name = type.Identifier.ValueText;
            if (name.Length > 0 && (!char.IsUpper(name[0]) || name.Contains('_'))) Add(observations, type, "be-type-naming", "type-case");
            if (type is InterfaceDeclarationSyntax && (name.Length < 2 || name[0] != 'I' || !char.IsUpper(name[1]))) Add(observations, type, "be-type-naming", "interface-prefix");
            if (type is EnumDeclarationSyntax || type.Parent is not (CompilationUnitSyntax or BaseNamespaceDeclarationSyntax) || !Has(type.Modifiers, SyntaxKind.PublicKeyword)) continue;
            var file = "/" + input.Path.Replace('\\', '/');
            var isInterface = type is InterfaceDeclarationSyntax;
            if (name.EndsWith("Repository", StringComparison.Ordinal))
            {
                var expected = isInterface ? "/Src/Infrastructure/Persistence/Interfaces/" : "/Src/Infrastructure/Persistence/Repositories/";
                if (!file.Contains(expected, StringComparison.OrdinalIgnoreCase)) Add(observations, type, "be-repository-placement", "repository-placement");
            }
            var suffix = file.Contains("/Src/Presentation/DTOs/Requests/", StringComparison.OrdinalIgnoreCase) ? "RequestDto"
                : file.Contains("/Src/Presentation/DTOs/Responses/", StringComparison.OrdinalIgnoreCase) ? "ResponseDto"
                : file.Contains("/Src/Application/UseCases/", StringComparison.OrdinalIgnoreCase) ? "UseCase"
                : file.Contains("/Src/Infrastructure/Persistence/Repositories/", StringComparison.OrdinalIgnoreCase) ? "Repository"
                : isInterface && file.Contains("/Src/Infrastructure/Persistence/Interfaces/", StringComparison.OrdinalIgnoreCase) ? "Repository" : null;
            if (suffix is not null && !name.EndsWith(suffix, StringComparison.Ordinal)) Add(observations, type, "be-role-naming", "role-suffix");
        }
        foreach (var field in root.DescendantNodes().OfType<FieldDeclarationSyntax>())
        {
            if (!Has(field.Modifiers, SyntaxKind.PrivateKeyword) || !Has(field.Modifiers, SyntaxKind.ReadOnlyKeyword) || Has(field.Modifiers, SyntaxKind.StaticKeyword)) continue;
            var type = field.Parent as TypeDeclarationSyntax;
            if (type is null) continue;
            var constructors = type.Members.OfType<ConstructorDeclarationSyntax>().ToArray();
            foreach (var variable in field.Declaration.Variables)
            {
                var fieldSymbol = model.GetDeclaredSymbol(variable);
                var dependency = constructors.Any(c => c.DescendantNodes().OfType<AssignmentExpressionSyntax>().Any(a =>
                    SymbolEqualityComparer.Default.Equals(model.GetSymbolInfo(a.Left).Symbol, fieldSymbol)
                    && ParameterSource(model, a.Right) is { } parameter && c.ParameterList.Parameters.Any(p => SymbolEqualityComparer.Default.Equals(model.GetDeclaredSymbol(p), parameter))))
                    || variable.Initializer?.Value is { } value && ParameterSource(model, value) is { } primary
                    && type.ParameterList?.Parameters.Any(p => SymbolEqualityComparer.Default.Equals(model.GetDeclaredSymbol(p), primary)) == true;
                var name = variable.Identifier.ValueText;
                if (dependency && (name.Length < 2 || name[0] != '_' || !char.IsLower(name[1]) || name[1..].Contains('_'))) Add(observations, variable, "be-dependency-naming", "dependency-field");
            }
        }
        foreach (var member in root.DescendantNodes())
        {
            if (member is EventFieldDeclarationSyntax eventField)
                foreach (var variable in eventField.Declaration.Variables)
                    if (variable.Identifier.ValueText.Length > 0 && (!char.IsUpper(variable.Identifier.ValueText[0]) || variable.Identifier.ValueText.Contains('_')))
                        Add(observations, variable, "be-member-naming", "member-case");
            SyntaxToken? identifier = member switch
            {
                MethodDeclarationSyntax m when m.ExplicitInterfaceSpecifier is null && !Has(m.Modifiers, SyntaxKind.OverrideKeyword) => m.Identifier,
                PropertyDeclarationSyntax p when p.ExplicitInterfaceSpecifier is null && !Has(p.Modifiers, SyntaxKind.OverrideKeyword) => p.Identifier,
                EventDeclarationSyntax e when e.ExplicitInterfaceSpecifier is null => e.Identifier,
                EnumMemberDeclarationSyntax e => e.Identifier,
                _ => null
            };
            if (identifier is { } id && id.ValueText.Length > 0 && (!char.IsUpper(id.ValueText[0]) || id.ValueText.Contains('_')))
                Add(observations, member, "be-member-naming", "member-case");
            if (member is MethodDeclarationSyntax method && method.ExplicitInterfaceSpecifier is null && !Has(method.Modifiers, SyntaxKind.OverrideKeyword)
                && !method.Identifier.ValueText.EndsWith("Async", StringComparison.Ordinal))
            {
                var returnType = model.GetDeclaredSymbol(method)?.ReturnType;
                if (CoreType(returnType, "System.Threading.Tasks", "Task")) Add(observations, member, "be-async-naming", "async-suffix", "semantic");
                else if (returnType is IErrorTypeSymbol && method.ReturnType.ToString().Contains("Task", StringComparison.Ordinal)) diagnostics.Add($"ASYNC_NAMING_SYMBOL_UNRESOLVED:{tree.GetLineSpan(method.Span).StartLinePosition.Line + 1}");
            }
        }
        AdvisorySmells(root, observations);
        foreach (var node in root.DescendantNodes())
        {
            if (node is PostfixUnaryExpressionSyntax postfix && postfix.IsKind(SyntaxKind.SuppressNullableWarningExpression)) Add(observations, node, "be-null-forgiving", "nullable-suppression", at: postfix.OperatorToken);
            if (node is BinaryExpressionSyntax binary && (binary.IsKind(SyntaxKind.EqualsExpression) || binary.IsKind(SyntaxKind.NotEqualsExpression))
                && (NullLiteral(binary.Left) || NullLiteral(binary.Right))) Add(observations, node, "be-null-comparison", "null-equality");
            if (node is CatchClauseSyntax clause && clause.Block.Statements.Count == 0) Add(observations, node, "be-empty-catch", "empty-catch");
            if (FunctionScope(node))
            {
                // else-if is an IfStatement under ElseClause, so it counts; a bare else adds nothing.
                var branches = node.DescendantNodes(n => n == node || !FunctionScope(n)).OfType<IfStatementSyntax>().Count();
                if (branches > BranchLimit) Add(observations, node, "be-method-branches", "branch-limit", at: ScopeToken(node) ?? node.GetFirstToken());
            }
            if (node is BaseMethodDeclarationSyntax or LocalFunctionStatementSyntax
                && !(node is MethodDeclarationSyntax { ExplicitInterfaceSpecifier: not null } || node is MemberDeclarationSyntax declared && (Has(declared.Modifiers, SyntaxKind.OverrideKeyword) || Has(declared.Modifiers, SyntaxKind.ExternKeyword))))
            {
                var parameters = node is BaseMethodDeclarationSyntax baseMethod ? baseMethod.ParameterList.Parameters.Count : ((LocalFunctionStatementSyntax)node).ParameterList.Parameters.Count;
                if (parameters > ParameterLimit) Add(observations, node, "be-parameter-count", "parameter-limit", at: ScopeToken(node));
            }
            if (node is ConditionalExpressionSyntax ternary && NestedTernary(ternary)) Add(observations, node, "be-nested-ternary", "nested-ternary", at: ternary.QuestionToken);
            if (InNameOf(node)) continue;
            if (node is MemberAccessExpressionSyntax member && member.Name.Identifier.ValueText == "Result")
            {
                var symbol = model.GetSymbolInfo(member).Symbol as IPropertySymbol;
                if (symbol is not null && TaskType(symbol.ContainingType)) Add(observations, node, "be-async-blocking", "task-result", "semantic");
                else if (model.GetTypeInfo(member.Expression).Type is null or IErrorTypeSymbol) diagnostics.Add($"ASYNC_SYMBOL_UNRESOLVED:{tree.GetLineSpan(node.Span).StartLinePosition.Line + 1}");
            }
            if (node is MemberBindingExpressionSyntax binding && binding.Name.Identifier.ValueText == "Result"
                && model.GetSymbolInfo(binding).Symbol is IPropertySymbol property && TaskType(property.ContainingType)) Add(observations, node, "be-async-blocking", "task-result", "semantic");
            if (node is InvocationExpressionSyntax invocation && invocation.Expression is MemberAccessExpressionSyntax call)
            {
                var method = model.GetSymbolInfo(invocation).Symbol as IMethodSymbol;
                var name = call.Name.Identifier.ValueText;
                if (name is "Wait" or "WaitAll" or "WaitAny" && TaskType(method?.ContainingType)) Add(observations, node, "be-async-blocking", "task-wait", "semantic");
                if (name == "GetResult" && CoreType(method?.ContainingType, "System.Runtime.CompilerServices", "TaskAwaiter", "ValueTaskAwaiter", "ConfiguredTaskAwaiter", "ConfiguredValueTaskAwaiter")) Add(observations, node, "be-async-blocking", "awaiter-get-result", "semantic");
                if (name == "FromResult" && invocation.Parent is AwaitExpressionSyntax awaitNode && CoreType(method?.ContainingType, "System.Threading.Tasks", "Task")) Add(observations, awaitNode, "be-async-blocking", "fake-async", "semantic");
                if ((name is "Wait" or "WaitAll" or "WaitAny" or "GetResult" or "FromResult") && method is null) diagnostics.Add($"ASYNC_SYMBOL_UNRESOLVED:{tree.GetLineSpan(node.Span).StartLinePosition.Line + 1}");
            }
        }
        return new(input.Path, "evaluated", diagnostics.Distinct().Order().ToArray(), observations);
    }

    public static int Main()
    {
        try
        {
            Console.InputEncoding = new UTF8Encoding(false);
            Console.OutputEncoding = new UTF8Encoding(false);
            var inputs = JsonSerializer.Deserialize<Input[]>(Console.In.ReadToEnd(), Json) ?? throw new InvalidOperationException();
            var options = new CSharpParseOptions(LanguageVersion.Latest);
            var trees = inputs.Select(i => CSharpSyntaxTree.ParseText(i.Text, options, i.Path)).ToArray();
            var frameworkNames = new HashSet<string>(["System.Private.CoreLib.dll", "System.Runtime.dll", "System.Threading.Tasks.dll", "System.Threading.Tasks.Extensions.dll", "System.Collections.dll", "System.Linq.dll"], StringComparer.OrdinalIgnoreCase);
            var metadata = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "").Split(Path.PathSeparator).Where(p => frameworkNames.Contains(Path.GetFileName(p))).Order(StringComparer.Ordinal).ToArray();
            var references = metadata.Select(p => MetadataReference.CreateFromFile(p)).ToArray();
            // One compilation per declared project, so implicit usings never leak across services.
            var models = new SemanticModel[inputs.Length];
            foreach (var group in inputs.Select((input, index) => (input, index)).GroupBy(item => item.input.Project ?? "", StringComparer.Ordinal))
            {
                var usings = group.First().input.GlobalUsings ?? [];
                if (usings.Any(u => u.Split('.').Any(part => !SyntaxFacts.IsValidIdentifier(part)))) throw new InvalidOperationException();
                var groupTrees = group.Select(item => trees[item.index]).ToList();
                if (usings.Length > 0) groupTrees.Add(CSharpSyntaxTree.ParseText(string.Concat(usings.Select(u => $"global using global::{u};\n")), options, "<implicit-usings>"));
                var compilation = CSharpCompilation.Create("AgriMapLintInput", groupTrees, references, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
                foreach (var item in group) models[item.index] = compilation.GetSemanticModel(trees[item.index], ignoreAccessibility: true);
            }
            var results = inputs.Select((input, index) => Analyze(input, trees[index], models[index])).ToArray();
            Console.Out.Write(JsonSerializer.Serialize(new
            {
                protocolVersion = 2,
                roslynVersion = typeof(CSharpSyntaxTree).Assembly.GetName().Version?.ToString(),
                frameworkFiles = metadata.Select(p => new { name = Path.GetFileName(p), digest = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p))).ToLowerInvariant() }),
                files = results
            }, Json));
            return 0;
        }
        catch { Console.Out.Write("{\"error\":\"CSHARP_READER_FAILED\"}"); return 2; }
    }
}
