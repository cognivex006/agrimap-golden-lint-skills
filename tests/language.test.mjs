import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectLanguage, lexerLanguage, surfacesOf } from '../skills/agrimap-golden-lint-skills/scripts/language.mjs';
import { classify } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { securityTable } from '../skills/agrimap-golden-lint-skills/scripts/security.mjs';
import { maskLexical } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';

const script = name => readFileSync(new URL(`../skills/agrimap-golden-lint-skills/scripts/${name}`, import.meta.url), 'utf8');

test('language and surface come from the path before any rule is chosen', () => {
  const cases = {
    'services/agmws-a/Src/Program.cs': ['csharp', 'csharp'],
    'services/agmws-a/sql/db/procedure/X_Q.sql': ['tsql', 'sql'],
    'apps/web/agmwa-a/src/app/a.component.ts': ['typescript', 'angular'],
    'apps/web/agmwa-a/src/app/a.component.html': ['html', 'angular-template'],
    'tools/release.mjs': ['javascript', 'javascript'],
    'apps/web/agmwa-a/src/styles.scss': ['css', 'css'],
    'services/agmws-a/Dockerfile': ['dockerfile', 'docker'],
    'apps/web/agmwa-a/nginx/prod/nginx.conf': ['nginx', 'nginx'],
    'README.txt': ['unknown', null]
  };
  for (const [p, [language, surface]] of Object.entries(cases)) assert.deepEqual([detectLanguage(p).language, detectLanguage(p).surface], [language, surface], p);
  assert.deepEqual(surfacesOf(detectLanguage('apps/web/agmwa-a/src/app/a.ts')), ['angular', 'typescript']);
  assert.equal(classify('apps/web/agmwa-a/src/app/a.component.html').language, 'html');
  assert.equal(classify('services/agmws-a/Src/A.cs').language, 'csharp');
});

test('no lexer falls back to another language', () => {
  assert.equal(lexerLanguage(detectLanguage('a.ts')), 'ts');
  assert.throws(() => lexerLanguage(detectLanguage('a.html')), /LEXER_UNAVAILABLE:html/);
  assert.doesNotMatch(script('security.mjs'), /\? 'cs' : 'ts'/);
  assert.doesNotMatch(script('scanner.mjs'), /\.startsWith\('sql'\) \? 'sql' : 'cs'/);
});

test('TypeScript template literals are masked as TypeScript', () => {
  assert.equal(maskLexical('const q = `SELECT ${a}`;', 'ts').includes('SELECT'), false);
});

test('every security lane maps to a Golden surface file with language-prefixed Sonar keys', () => {
  const surfaceFor = lane => lane.startsWith('be-') ? 'csharp' : lane.startsWith('sql-') ? 'sql' : 'angular';
  const prefix = { csharp: 'csharpsquid:', sql: 'tsql:', angular: 'typescript:', typescript: 'typescript:' };
  for (const entry of securityTable) {
    for (const lane of entry.lanes) assert(entry.surfaces[surfaceFor(lane)], `${entry.class}:${lane}`);
    for (const [surface, value] of Object.entries(entry.surfaces)) {
      assert.equal(value.goldenEntry, `references/patterns/security/${surface}.md`);
      assert(value.sonarKeys.every(k => k.startsWith(prefix[surface])), `${entry.class}:${surface}`);
    }
  }
});
