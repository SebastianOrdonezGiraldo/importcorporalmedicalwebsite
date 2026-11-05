const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../../src');
const modules = new Map();

// Render the actual server components, rather than duplicating their grouping logic.
function loadComponent(file) {
  if (modules.has(file)) return modules.get(file);
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const nativeRequire = createRequire(file);
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    process,
    URL,
    URLSearchParams,
    require: (name) => {
      if (!name.startsWith('@/') && !name.startsWith('.')) return nativeRequire(name);
      const base = name.startsWith('@/') ? path.join(sourceRoot, name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = [base + '.tsx', base + '.ts'].find((candidate) => fs.existsSync(candidate));
      if (!resolved) throw new Error(`Cannot resolve ${name} from ${file}`);
      return loadComponent(resolved);
    },
  }, { filename: file });
  modules.set(file, module.exports);
  return module.exports;
}

const CatalogView = loadComponent(path.join(sourceRoot, 'components/CatalogView.tsx')).default;
module.exports.renderCatalog = (props) => renderToStaticMarkup(createElement(CatalogView, props));
