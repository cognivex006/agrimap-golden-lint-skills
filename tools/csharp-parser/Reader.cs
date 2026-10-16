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
    private sealed record Input(string Path, string Text, string Profile);
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

    private static void Add(List<Observation> output, SyntaxNode node, string detector, string kind, string evidence = "syntax")
    {
        var position = node.SyntaxTree.GetLineSpan(node.Span).StartLinePosition;
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
        var tokens = kind is "member-case" or "async-suffix" ? kind + ":" + (node switch
        {
            MethodDeclarationSyntax m => m.Identifier.ValueText,
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
        foreach (var node in root.DescendantNodes())
        {
            if (node is PostfixUnaryExpressionSyntax postfix && postfix.IsKind(SyntaxKind.SuppressNullableWarningExpression)) Add(observations, node, "be-null-forgiving", "nullable-suppression");
            if (node is BinaryExpressionSyntax binary && (binary.IsKind(SyntaxKind.EqualsExpression) || binary.IsKind(SyntaxKind.NotEqualsExpression))
                && (NullLiteral(binary.Left) || NullLiteral(binary.Right))) Add(observations, node, "be-null-comparison", "null-equality");
            if (node is CatchClauseSyntax clause && clause.Block.Statements.Count == 0) Add(observations, node, "be-empty-catch", "empty-catch");
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
            var trees = inputs.Select(i => CSharpSyntaxTree.ParseText(i.Text, new CSharpParseOptions(LanguageVersion.Latest), i.Path)).ToArray();
            var frameworkNames = new HashSet<string>(["System.Private.CoreLib.dll", "System.Runtime.dll", "System.Threading.Tasks.dll", "System.Threading.Tasks.Extensions.dll", "System.Collections.dll", "System.Linq.dll"], StringComparer.OrdinalIgnoreCase);
            var metadata = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? "").Split(Path.PathSeparator).Where(p => frameworkNames.Contains(Path.GetFileName(p))).Order(StringComparer.Ordinal).ToArray();
            var compilation = CSharpCompilation.Create("AgriMapLintInput", trees, metadata.Select(p => MetadataReference.CreateFromFile(p)), new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
            var results = inputs.Select((input, index) => Analyze(input, trees[index], compilation.GetSemanticModel(trees[index], ignoreAccessibility: true))).ToArray();
            Console.Out.Write(JsonSerializer.Serialize(new
            {
                protocolVersion = 1,
                roslynVersion = typeof(CSharpSyntaxTree).Assembly.GetName().Version?.ToString(),
                frameworkFiles = metadata.Select(p => new { name = Path.GetFileName(p), digest = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(p))).ToLowerInvariant() }),
                files = results
            }, Json));
            return 0;
        }
        catch { Console.Out.Write("{\"error\":\"CSHARP_READER_FAILED\"}"); return 2; }
    }
}
