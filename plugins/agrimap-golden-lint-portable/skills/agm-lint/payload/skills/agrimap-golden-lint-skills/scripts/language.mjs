// Language and surface are decided from the path before any rule is chosen, following the
// language/surface split of the Golden security-matrix.md and sonarqube-matrix.md. First match wins;
// nothing falls back to another language: an unrecognized file is 'unknown' and only counted.
const angularRoot = /^(apps\/web\/agmwa-[^/]+|standards\/libraries\/angular\/agrimap-platform)\//;
const table = [
  [p => /(^|\/)(Dockerfile[^/]*|\.dockerignore)$/.test(p), 'dockerfile', 'docker', 'basename'],
  [p => /(^|\/)Jenkinsfile[^/]*$/.test(p), 'jenkins', 'docker', 'basename'],
  [p => /(^|\/)nginx\/.+\.conf$/i.test(p), 'nginx', 'nginx', 'path'],
  [p => /\.cs$/i.test(p), 'csharp', 'csharp', 'extension'],
  [p => /\.cshtml$/i.test(p), 'razor', 'html', 'extension'],
  [p => /\.sql$/i.test(p), 'tsql', 'sql', 'extension'],
  [p => /\.d\.ts$/.test(p), 'typescript-declaration', null, 'extension'],
  [p => /\.ts$/.test(p) && angularRoot.test(p), 'typescript', 'angular', 'path'],
  [p => /\.ts$/.test(p), 'typescript', 'typescript', 'extension'],
  [p => /\.html?$/i.test(p) && angularRoot.test(p), 'html', 'angular-template', 'path'],
  [p => /\.html?$/i.test(p), 'html', 'html', 'extension'],
  [p => /\.(js|mjs|cjs)$/i.test(p), 'javascript', 'javascript', 'extension'],
  [p => /\.(scss|css)$/i.test(p), 'css', 'css', 'extension'],
  [p => /\.json$/i.test(p), 'json', null, 'extension']
];
// A surface reads its own Golden file first, then the ones it extends (angular.md on top of typescript.md).
const inheritance = { angular: ['typescript'], 'angular-template': ['html'], javascript: ['typescript'] };
// Lexers that exist today. Anything else has no lexer: the caller reports it instead of guessing.
const lexers = { csharp: 'cs', typescript: 'ts', javascript: 'ts', tsql: 'sql' };

export function detectLanguage(relative) {
  const hit = table.find(([test]) => test(relative));
  if (!hit) return { language: 'unknown', surface: null, inherits: [], languageBasis: 'none' };
  const [, language, surface, languageBasis] = hit;
  return { language, surface, inherits: inheritance[surface] || [], languageBasis };
}
// Callers that pass a bare { path } get the same path-based decision, never another language.
export const withLanguage = file => file.language ? file : { ...file, ...detectLanguage(file.path) };
export const surfacesOf = file => file.surface ? [file.surface, ...(file.inherits || [])] : [];
export function lexerLanguage(file) {
  const lexer = lexers[file.language];
  if (!lexer) throw new Error(`LEXER_UNAVAILABLE:${file.language || 'unknown'}`);
  return lexer;
}
