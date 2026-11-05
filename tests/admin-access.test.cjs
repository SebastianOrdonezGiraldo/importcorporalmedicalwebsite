const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// A layout redirect does not stop its pages from rendering: without their own check,
// admin data reaches anonymous visitors inside the body of the redirect response.
const panel = path.resolve(__dirname, '../src/app/admin/(panel)');
const pages = fs.readdirSync(panel, { recursive: true }).map(String)
  .filter((file) => path.basename(file) === 'page.tsx').map((file) => path.join(panel, file));

function defaultExport(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  return source.statements.find((node) => ts.isFunctionDeclaration(node) &&
    node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
}

async function renderAnonymously(file) {
  const queries = [];
  const redirected = new Error('NEXT_REDIRECT');
  const anything = new Proxy(() => null, { get: (_, name) => (name === '__esModule' ? true : anything) });
  const db = new Proxy({}, { get: (_, name) => (name === '__esModule' ? true : () => { queries.push(name); return []; }) });
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (name) => {
    if (name === '@/lib/auth') return { requireAdmin: async () => { throw redirected; } };
    if (name === '@/lib/db') return db;
    return anything;
  } }, { filename: file });
  const props = { params: Promise.resolve({ id: '1' }), searchParams: Promise.resolve({}) };
  const failure = await Promise.resolve().then(() => module.exports.default(props)).catch((error) => error);
  return { failure, redirected, queries };
}

test('the admin panel has the expected pages to protect', () => {
  assert.ok(pages.length >= 7, `Solo se encontraron ${pages.length} páginas.`);
});

for (const file of pages) {
  const name = path.relative(panel, file).replaceAll(path.sep, '/');

  test(`${name} checks the session before doing anything else`, () => {
    const page = defaultExport(file);
    assert.ok(page?.body, 'La página debe exportar una función por defecto.');
    assert.equal(page.body.statements[0]?.getText(), 'await requireAdmin();');
  });

  test(`${name} reads no catalog data for an anonymous visitor`, async () => {
    const { failure, redirected, queries } = await renderAnonymously(file);
    assert.equal(failure, redirected);
    assert.deepEqual(queries, []);
  });
}
