const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function loadServer(relativePath, cache = new Map()) {
  const filename = path.resolve(__dirname, "../..", relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, compiled);
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier.startsWith("@/")) return loadServer(`src/${specifier.slice(2)}.ts`, cache);
    if (specifier.startsWith(".")) {
      return loadServer(path.relative(path.resolve(__dirname, "../.."), path.resolve(path.dirname(filename), specifier + ".ts")), cache);
    }
    return originalRequire(specifier);
  };
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  compiled._compile(outputText, filename);
  return compiled.exports;
}

module.exports = { loadServer };
