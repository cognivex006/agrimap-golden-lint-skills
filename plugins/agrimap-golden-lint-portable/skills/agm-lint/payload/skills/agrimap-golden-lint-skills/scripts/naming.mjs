import path from 'node:path';
import { hash } from './contracts.mjs';

// Only structural naming from pinned Golden entries. Never infer business meaning.
export function tsNaming(ts, sf, rule, file, checker) {
  const results = [], library = file.lane === 'fe-library';
  const push = (node, message, kind) => {
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const evidence = kind === 'file-name' ? path.posix.basename(file.path) : kind === 'component-selector' ? node.initializer.getText(sf) : node.name?.getText(sf) || node.getText(sf);
    results.push({ line: pos.line + 1, column: pos.character + 1, anchor: kind + ':' + (node.name?.text || 'file'),
      fingerprint: hash(kind + ':' + evidence), observation: message, observationKind: 'syntax-observation',
      disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'syntax' });
  };
  const filename = path.posix.basename(file.path);
  if (rule.detectorId.endsWith('file-naming') && !/^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*\.ts$/.test(filename))
    push(sf, 'ชื่อไฟล์ไม่ตรงรูปแบบ kebab-case ของ Golden; ตรวจ imports และประวัติก่อนเปลี่ยนชื่อ', 'file-name');
  const angular = new Map(), rxjs = new Map();
  for (const s of sf.statements.filter(ts.isImportDeclaration)) {
    if (!ts.isStringLiteral(s.moduleSpecifier)) continue;
    const target = s.moduleSpecifier.text === '@angular/core' ? angular : s.moduleSpecifier.text === 'rxjs' ? rxjs : null;
    const b = s.importClause?.namedBindings;
    if (target && b && ts.isNamedImports(b)) for (const e of b.elements) target.set(e.name.text, (e.propertyName || e.name).text);
  }
  const imported = (name, map, node) => {
    // A shadowing declaration invalidates the import identity for this site.
    if (!ts.isIdentifier(name) || !map.has(name.text)) return null;
    const declarations = checker?.getSymbolAtLocation(name)?.declarations;
    if (checker && (declarations?.length !== 1 || !ts.isImportSpecifier(declarations[0]))) return null;
    let p = node;
    while (p && p !== sf) {
      if (p.parameters?.some(v => ts.isIdentifier(v.name) && v.name.text === name.text)) return null;
      if (p.statements?.some(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name.text))) return null;
      p = p.parent;
    }
    return map.get(name.text);
  };
  function visit(node) {
    if (rule.detectorId.endsWith('file-naming') && ts.isClassDeclaration(node)) {
      const component = (ts.getDecorators(node) || []).find(d => ts.isCallExpression(d.expression) && imported(d.expression.expression, angular, node) === 'Component');
      if (component) {
        const name = node.name?.text || '';
        if (library ? filename.includes('.component.') || name.endsWith('Component') : !filename.endsWith('.component.ts') || !name.endsWith('Component'))
          push(node, library ? 'Library component ใหม่ใช้ text-box.ts / TextBox ไม่มี Component suffix; ตรวจ public exports และ legacy exception ก่อน rename' : 'App component ใช้ text-box.component.ts / TextBoxComponent; ตรวจขอบเขตของ component และ consumers ก่อน rename', 'component-name');
        const arg = component.expression.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) for (const p of arg.properties) {
          if (ts.isPropertyAssignment(p) && (p.name.text === 'selector') && ts.isStringLiteral(p.initializer) && !/^agrimap-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.initializer.text))
            push(p, 'Component selector ไม่ตรง agrimap- ตามด้วย kebab-case; ตรวจ templates/consumers และ legacy ก่อนเปลี่ยน', 'component-selector');
        }
      }
      if (!library && node.name) {
        const suffix = /\.(facade|store|service|interceptor)\.ts$/.exec(filename)?.[1];
        if (suffix && !node.name.text.endsWith(suffix[0].toUpperCase() + suffix.slice(1))) push(node, 'ชื่อ class ไม่ลงท้ายตามบทบาทไฟล์ Facade/Store/Service/Interceptor; ยืนยันว่าเป็น class หลักของไฟล์ก่อนแก้', 'class-role-name');
      }
    }
    if (rule.detectorId === 'fe-symbol-naming') {
      if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
        const name = node.name.text;
        if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && /^[IT][A-Z]/.test(name))
          push(node.name, 'Type/interface ใช้ PascalCase ไม่มี I/T prefix; class/enum ใช้ PascalCase โดยตรวจ compatibility ก่อนเปลี่ยน', 'type-name');
        if (ts.isEnumDeclaration(node) && !filename.endsWith('.enum.ts')) push(node, 'Enum ของแอปอยู่ในไฟล์ .enum.ts; ยืนยัน exports และ imports ก่อนย้าย', 'enum-file-name');
      }
      if (ts.isEnumMember(node) && ts.isIdentifier(node.name) && !/^[A-Z][A-Za-z0-9]*$/.test(node.name.text)) push(node.name, 'ชื่อ enum member ใช้ PascalCase; ตรวจ serialized values และ consumers ก่อน rename', 'enum-member-name');
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && /^handle[A-Z]/.test(node.name.text) && filename.endsWith('.component.ts'))
        push(node.name, 'พบ method รูป handle*: handler ใหม่ใช้ on* แต่ต้องยืนยัน event binding; legacy ไม่ต้องไล่เปลี่ยน', 'handler-name');
      if ((ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name)) {
        const name = node.name.text, value = node.initializer, type = node.type;
        if (ts.isVariableDeclaration(node) && ts.isVariableStatement(node.parent.parent) && node.parent.parent.parent === sf && node.parent.flags & ts.NodeFlags.Const && /\/shared\/constants\//.test('/' + file.path) && !name.endsWith('Provider') && !/^[a-z][A-Za-z0-9]*$/.test(name))
          push(node.name, 'const กลางใน shared/constants ใช้ camelCase; ไม่ใช้ SCREAMING_SNAKE และไม่รวม provider constants', 'shared-constant-name');
        if (value && ts.isCallExpression(value)) {
          const primitive = imported(value.expression, angular, node);
          if (['signal', 'computed', 'input', 'model', 'output'].includes(primitive)) {
            if (name.startsWith('_') || ['input', 'model', 'output'].includes(primitive) && !/^[a-z][A-Za-z0-9]*$/.test(name)) push(node.name, 'Signal/input/model/output ไม่ใช้ _ prefix และ input/model/output ใช้ camelCase', 'signal-name');
            if (primitive === 'output' && /^on[A-Z]/.test(name)) push(node.name, 'output ใช้ชื่อเหตุการณ์ เช่น closed/filterChange; onClosed เป็นชื่อ handler ฝั่งรับ ตรวจ alias และ templates ก่อนแก้', 'output-name');
          }
        }
        const ref = type && ts.isTypeReferenceNode(type) ? imported(type.typeName, rxjs, node) : value && ts.isNewExpression(value) ? imported(value.expression, rxjs, node) : null;
        if (ref === 'Observable' && !name.endsWith('$')) push(node.name, 'ตัวแปร/property ที่ประกาศเป็น RxJS Observable ใช้ suffix $; ตรวจ exports และ callers ก่อน rename', 'observable-name');
        if (['Subject', 'BehaviorSubject', 'ReplaySubject', 'AsyncSubject'].includes(ref) && !name.endsWith('Subject')) push(node.name, 'ตัวแปร/property ที่ประกาศเป็น RxJS Subject ใช้ suffix Subject; ตรวจ consumers ก่อน rename', 'subject-name');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

// T-SQL tokenization: nested comments, escaped strings and delimited identifiers.
export function sqlTokens(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text.startsWith('--', i)) { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (text.startsWith('/*', i)) {
      let depth = 1; i += 2;
      while (i < text.length && depth) { if (text.startsWith('/*', i)) { depth++; i += 2; } else if (text.startsWith('*/', i)) { depth--; i += 2; } else i++; }
      if (depth) throw new Error('SQL_LEXICAL_CONTEXT_REQUIRED');
      continue;
    }
    if (text[i] === "'" || /[nN]/.test(text[i]) && text[i + 1] === "'") {
      if (text[i] !== "'") i++;
      i++; let closed = false;
      while (i < text.length) { if (text[i++] === "'") { if (text[i] === "'") i++; else { closed = true; break; } } }
      if (!closed) throw new Error('SQL_LEXICAL_CONTEXT_REQUIRED');
      continue;
    }
    const start = i;
    if (text[i] === '[' || text[i] === '"') {
      const close = text[i] === '[' ? ']' : '"'; let value = '', closed = false; i++;
      while (i < text.length) { const c = text[i++]; if (c === close) { if (text[i] === close) { value += close; i++; } else { closed = true; break; } } else value += c; }
      if (!closed) throw new Error('SQL_LEXICAL_CONTEXT_REQUIRED');
      out.push({ value, index: start, identifier: true, quoted: true }); continue;
    }
    const word = /^[A-Za-z_@#][A-Za-z0-9_@$#]*/.exec(text.slice(i));
    if (word) { i += word[0].length; out.push({ value: word[0], index: start, identifier: true }); }
    else { out.push({ value: text[i++], index: start, identifier: false }); }
  }
  return out;
}

export function sqlNaming(text, rule, file) {
  const tokens = sqlTokens(text), results = [], upper = s => /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(s);
  const keyword = (t, word) => t && !t.quoted && t.value.toUpperCase() === word;
  const add = (token, message, kind) => results.push({ line: text.slice(0, token.index).split('\n').length, column: token.index - text.lastIndexOf('\n', token.index - 1), anchor: kind + ':' + token.value, fingerprint: hash(kind + ':' + token.value), observation: message, observationKind: 'text-observation', disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text' });
  const declarations = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].quoted || !['CREATE', 'ALTER'].includes(tokens[i].value.toUpperCase())) continue;
    let j = i + 1;
    if (keyword(tokens[j], 'OR') && keyword(tokens[j + 1], 'ALTER')) j += 2;
    const type = tokens[j]?.value.toUpperCase();
    if (tokens[j]?.quoted || !['TABLE', 'PROC', 'PROCEDURE'].includes(type) || !tokens[j + 1]?.identifier) continue;
    if (type === 'TABLE' && tokens[i].value.toUpperCase() === 'ALTER') continue;
    let name = tokens[++j], schema = null;
    if (tokens[j + 1]?.value === '.' && tokens[j + 2]?.identifier) { schema = name.value; name = tokens[j + 2]; j += 2; }
    i = j; // CREATE OR ALTER is one declaration, not another ALTER later.
    // Procedure-body objects and temporary tables are not output artifacts.
    if (name.value.startsWith('#') || type === 'TABLE' && file.lane !== 'sql-table') continue;
    if (type !== 'TABLE' && file.lane !== 'sql-procedure') continue;
    declarations.push({ name, schema, type });
    if (!upper(name.value)) add(name, 'ชื่อ table/procedure ใช้ UPPER_SNAKE_CASE; ตรวจ deployed name และ callers ก่อนเปลี่ยน', 'sql-object-name');
    if (path.posix.basename(file.path) !== name.value + '.sql') add(name, 'ชื่อไฟล์ต้องตรงชื่อ object และเป็น .sql; ตรวจ deployment scripts ก่อนย้าย/rename', 'sql-file-name');
    if (type !== 'TABLE' && !/_(?:I|U|D|Q|CHECK_Q)$/.test(name.value)) add(name, 'Procedure ใหม่ใช้ suffix _I/_U/_D/_Q/_CHECK_Q; suffix อื่นต้องมี owner exception ไม่เดาความหมายจาก body', 'sql-procedure-suffix');
    if (schema !== 'agrimap_app') add(name, 'Object ใหม่ประกาศใน schema agrimap_app; schema เดิมอาจเป็น deployed contract ห้ามย้ายโดยอัตโนมัติ', 'sql-schema-name');
    if (type === 'TABLE' && tokens[j + 1]?.value === '(') {
      let depth = 1, expectColumn = true;
      for (let k = j + 2; k < tokens.length && depth; k++) {
        const t = tokens[k], value = t.value.toUpperCase();
        if (depth === 1 && expectColumn) {
          if (t.identifier && (t.quoted || !['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'INDEX', 'PERIOD'].includes(value)) && !upper(t.value)) add(t, 'ชื่อ column ใช้ UPPER_SNAKE_CASE; ตรวจ result sets/ORM/wire contracts ก่อน rename', 'sql-column-name');
          expectColumn = false;
        }
        if (t.value === '(') depth++; else if (t.value === ')') depth--; else if (depth === 1 && t.value === ',') expectColumn = true;
      }
      if (depth) throw new Error('SQL_LEXICAL_CONTEXT_REQUIRED');
    }
  }
  if (declarations.length > 1) add(declarations[1].name, 'Golden กำหนดหนึ่ง table หรือ procedure ต่อไฟล์; ตรวจ deployment ordering ก่อนแยก', 'sql-object-count');
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], next = tokens[i + 1];
    const constraintKind = tokens[i + 2];
    const expected = [['PRIMARY', 'PK'], ['UNIQUE', 'UQ'], ['DEFAULT', 'DF'], ['CHECK', 'CK'], ['FOREIGN', 'FK']].find(([word]) => keyword(constraintKind, word))?.[1];
    if (keyword(t, 'CONSTRAINT') && next?.identifier && expected && (!upper(next.value) || !next.value.startsWith(expected + '_'))) add(next, 'ชื่อ constraint ใช้ PK_/UQ_/DF_/CK_/FK_ และ UPPER_SNAKE_CASE ตามชนิดจริง; ตรวจชื่อที่ deployment อ้างอิง', 'sql-constraint-name');
    if (keyword(t, 'INDEX') && next?.identifier && tokens.slice(Math.max(0, i - 3), i).some(v => keyword(v, 'CREATE')) && (!upper(next.value) || !/^(?:IX|UX)_/.test(next.value))) add(next, 'ชื่อ index ใช้ IX_/UX_ และ UPPER_SNAKE_CASE; ตรวจ uniqueness และ workload ก่อนเปลี่ยน', 'sql-index-name');
  }
  return results;
}
