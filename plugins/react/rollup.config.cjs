const fs = require('node:fs');
const path = require('node:path');

function getPkgJson(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }
  return {};
}

const pkg = getPkgJson(__dirname);
const rootPkg = getPkgJson(path.resolve(__dirname, '../..'));

const deps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(rootPkg.dependencies || {}),
  ...Object.keys(rootPkg.peerDependencies || {}),
]);

function external(id) {
  if (id.startsWith('.') || path.isAbsolute(id)) return false; // bundle local files
  // Treat any bare module specifier or node_modules import as external
  if (id.includes('node_modules')) return true;
  const [scopeOrName, maybeName] = id.split('/');
  const name = scopeOrName && scopeOrName.startsWith('@') && maybeName ? `${scopeOrName}/${maybeName}` : scopeOrName;
  return deps.has(name);
}

module.exports = (config) => {
  const newConfig = { ...config };
  if (Array.isArray(newConfig.output)) {
    newConfig.output = newConfig.output.map((o) => ({
      ...o,
      // Emit all JS files under a nested 'dist' directory inside the outputPath
      entryFileNames: o.format === 'cjs' ? 'dist/index.cjs' : 'dist/index.js',
      chunkFileNames: o.format === 'cjs' ? 'dist/[name].cjs' : 'dist/[name].js',
      assetFileNames: 'dist/[name][extname]',
      exports: o.format === 'cjs' ? 'named' : undefined
    }));
  } else if (newConfig.output) {
    newConfig.output = {
      ...newConfig.output,
      // Emit all JS files under a nested 'dist' directory inside the outputPath
      entryFileNames: newConfig.output.format === 'cjs' ? 'dist/index.cjs' : 'dist/index.js',
      chunkFileNames: newConfig.output.format === 'cjs' ? 'dist/[name].cjs' : 'dist/[name].js',
      assetFileNames: 'dist/[name][extname]',
      exports: newConfig.output.format === 'cjs' ? 'named' : undefined
    };
  }
  newConfig.external = external;
  return newConfig;
};
