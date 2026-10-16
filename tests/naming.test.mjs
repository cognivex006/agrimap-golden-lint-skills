import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixture, fe, cs, sql } from './helpers.mjs';
import { sqlTokens } from '../skills/agrimap-golden-lint-skills/scripts/naming.mjs';

const only = (report, id) => report.findings.filter(f => f.detectorId === id);
test('app and library component conventions stay distinct; Angular aliases are recognized', t => {
  const lib = 'standards/libraries/angular/agrimap-platform/projects/ui-kit/src/lib/text-box.ts';
  const f = fixture(t, {
    [fe]: "import {Component as C} from '@angular/core'; @C({selector:'app-demo'}) export class Demo {}",
    [lib]: "import {Component} from '@angular/core'; @Component({selector:'agrimap-text-box'}) export class TextBox {}"
  });
  const r = scan(f.args);
  assert.equal(r.scanStatus, 'completed');
  assert.equal(only(r, 'fe-file-naming').length, 2);
  assert.equal(only(r, 'fe-library-file-naming').length, 0);
  f.put(lib, "import {Component} from '@angular/core'; @Component({selector:'app-text-box'}) export class TextBoxComponent {}");
  assert.equal(only(scan(f.args), 'fe-library-file-naming').length, 2);
});
test('FE variable checks use declared Angular/RxJS imports, not arbitrary names or string contents', t => {
  const f = fixture(t, { [fe]: `import {output as out, signal} from '@angular/core';
import {Observable as Stream, Subject} from 'rxjs';
class Demo { onClose = out(); _state = signal(0); users: Stream<string>; search = new Subject(); arbitrary_name = 1; }
interface IUser {} type TConfig = {}; const text = 'class bad_name { onClose = output(); }';` });
  const r = scan(f.args);
  assert.equal(only(r, 'fe-symbol-naming').length, 6);
  f.put(fe, `class Observable {} class Subject {} function output() {} class Demo { users: Observable; search = new Subject(); onClose = output(); }
interface User {} type Config = {};`);
  assert.equal(only(scan(f.args), 'fe-symbol-naming').length, 0);
});
test('FE shadowed factory names, provider constants and legacy handler names stay candidates', t => {
  const file = fe.replace('features/demo/demo.component.ts', 'shared/constants/menu.ts');
  const f = fixture(t, { [file]: 'export const menuApp = [];', [fe]: `import {signal} from '@angular/core'; function local(signal: () => number) { const _value = signal(); } export const DemoProvider = []; class Demo { handleClick() {} }` });
  const r = scan(f.args);
  assert.equal(only(r, 'fe-symbol-naming').length, 1);
  assert(only(r, 'fe-symbol-naming').every(f => f.disposition === 'review-candidate' && f.applicability === 'unknown'));
});
test('C# members and Async suffix use runtime Task identity and preserve overrides/explicit implementations', t => {
  const f = fixture(t, { [cs]: `using System.Threading.Tasks; namespace AgriMap.Web.Service.Domain.Entities;
public class Demo { public int bad_name {get;set;} public Task Load() => Task.CompletedTask; public Task LoadAsync() => Task.CompletedTask; }
class TaskLike { public int badMethod() => 0; }` });
  const r = scan(f.args);
  assert.equal(only(r, 'be-member-naming').length, 2);
  assert.equal(only(r, 'be-async-naming').length, 1);
  f.put(cs, 'namespace AgriMap.Web.Service.Domain.Entities; class Task {} class Demo { Task Load() => new(); public override string ToString() => ""; }');
  assert.equal(only(scan(f.args), 'be-async-naming').length, 0);
});
test('SQL checks compare object/file/column/constraint shapes without executing SQL or parsing strings as objects', t => {
  const table = sql.replace('procedure/DEMO_Q.sql', 'table/DEMO.sql');
  const f = fixture(t, { [sql]: "CREATE OR ALTER PROCEDURE [agrimap_app].[DEMO_Q] AS SELECT 'CREATE TABLE bad (wrong int)'; /* outer /* CREATE PROC wrong */ comment */", [table]: 'CREATE TABLE [agrimap_app].[DEMO] ([ID] INT, [badName] INT, CONSTRAINT [wrong] PRIMARY KEY ([ID]));' });
  const r = scan(f.args);
  assert.equal(only(r, 'sql-procedure-naming').length, 0);
  assert.equal(only(r, 'sql-table-naming').length, 2);
  f.put(sql, 'CREATE OR ALTER PROCEDURE dbo.otherName AS SELECT 1;');
  assert.equal(only(scan(f.args), 'sql-procedure-naming').length, 4);
  assert.throws(() => sqlTokens('/* unterminated'), /SQL_LEXICAL_CONTEXT_REQUIRED/);
});
test('naming source drift blocks affected lane and malformed SQL is partial, not clean', t => {
  const f = fixture(t, { [sql]: "CREATE PROCEDURE 'unterminated" });
  const r = scan(f.args);
  assert.equal(r.scanStatus, 'partial');
  assert.equal(r.rules.find(r => r.detectorId === 'sql-procedure-naming').executionStatus, 'error');
});
test('canonical SQL ALTER constraints and procedure temp tables are not extra artifacts', t => {
  const table = sql.replace('procedure/DEMO_Q.sql', 'table/DEMO.sql');
  const f = fixture(t, {
    [table]: 'CREATE TABLE [agrimap_app].[DEMO] ([ID] INT, [CONSTRAINT] INT); ALTER TABLE [agrimap_app].[DEMO] ADD CONSTRAINT [DF_DEMO_ID] DEFAULT (1) FOR [ID]; ALTER TABLE [agrimap_app].[DEMO] CHECK CONSTRAINT [DF_DEMO_ID];',
    [sql]: 'CREATE OR ALTER PROCEDURE [agrimap_app].[DEMO_Q] AS BEGIN CREATE TABLE #TEMP (id int); SELECT 1; END;'
  });
  const r = scan(f.args);
  assert.equal(only(r, 'sql-table-naming').length, 0);
  assert.equal(only(r, 'sql-procedure-naming').length, 0);
  f.put(table, 'CREATE TABLE [agrimap_app].[DEMO] ([ID] INT, CONSTRAINT [DF_DEMO] PRIMARY KEY ([ID]));');
  assert.equal(only(scan(f.args), 'sql-table-naming').length, 1);
  f.put(table, 'CREATE TABLE [agrimap_app].[DEMO] ([ID] INT');
  assert.equal(scan(f.args).scanStatus, 'partial');
});
test('shared constant lint excludes function locals and Provider names', t => {
  const file = fe.replace('features/demo/demo.component.ts', 'shared/constants/menu.ts');
  const f = fixture(t, { [file]: 'export const BAD_NAME = []; export const DemoProvider = []; function factory() { const LOCAL_VALUE = 1; return LOCAL_VALUE; }' });
  assert.equal(only(scan(f.args), 'fe-symbol-naming').length, 1);
});
test('naming identities survive unrelated class/method body and comment edits', t => {
  const f = fixture(t, { [fe]: "import {Component} from '@angular/core'; @Component({selector:'app-demo'}) class Demo { run() { return 1; } }", [cs]: 'using System.Threading.Tasks; namespace AgriMap.Web.Service.Domain.Entities; class Demo { public Task load() => Task.CompletedTask; }' });
  const ids = report => report.findings.filter(f => ['fe-file-naming', 'be-member-naming', 'be-async-naming'].includes(f.detectorId)).map(f => f.findingId).sort();
  const before = ids(scan(f.args));
  f.put(fe, "// unrelated shift\nimport {Component} from '@angular/core'; @Component({selector:'app-demo'}) class Demo { run() { /* changed body */ return 2; } }");
  f.put(cs, 'using System.Threading.Tasks; namespace AgriMap.Web.Service.Domain.Entities; class Demo { public Task load() { /* changed body */ return Task.CompletedTask; } }');
  assert.deepEqual(ids(scan(f.args)), before);
});
