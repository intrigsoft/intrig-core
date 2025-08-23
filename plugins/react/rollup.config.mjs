import fs from 'node:fs';
import path from 'node:path';

function getPkgJson(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }
  return {};
}

const pkg = getPkgJson(new URL('.', import.meta.url).pathname);
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
  const name = scopeOrName?.startsWith('@') && maybeName ? `${scopeOrName}/${maybeName}` : scopeOrName;
  return deps.has(name);
}

export default () => ({
  external,
});
