const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

// A fresh module graph per fixture keeps server singletons isolated between restarts.
module.exports.createTypeScriptLoader = (globals = {}, overrides = {}) => {
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const nativeRequire = createRequire(file);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(compiled, {
      module, exports: module.exports, process, URL, URLSearchParams, FormData,
      ...globals,
      require: (name) => {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name === 'server-only') return {};
        if (name.startsWith('.')) {
          const candidate = path.resolve(path.dirname(file), name + '.ts');
          if (fs.existsSync(candidate)) return load(candidate);
        }
        return nativeRequire(name);
      },
    }, { filename: file });
    return module.exports;
  }
  return load;
};
