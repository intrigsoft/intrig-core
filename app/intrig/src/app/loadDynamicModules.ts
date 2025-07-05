import * as fsx from 'fs-extra';
import * as path from 'path';
import pacote from 'pacote';
import npa from 'npm-package-arg';
import { Logger } from '@nestjs/common';
import { IntrigConfig, Plugin } from 'common';
import { createJiti } from 'jiti';

const logger = new Logger('loadDynamicModules');

export async function loadDynamicModules(): Promise<Plugin[]> {
  const root = process.env.ROOT_DIR ?? process.cwd();
  const cfgPath = path.join(root, 'intrig.config.json');
  const cfg: IntrigConfig = fsx.readJsonSync(cfgPath);
  const specStr = cfg.generatorLib;
  const spec = npa(specStr);

  logger.log(`→ resolving plugin spec: ${specStr}`);

  // build cache path keyed by scope/name + version or 'latest'
  const nameSegments = spec.name!.split('/');
  const versionSegment = (spec.fetchSpec && spec.fetchSpec !== '*') ? spec.fetchSpec : 'latest';
  const cacheDir = path.join(root, '.intrig', 'cache', 'plugins', ...nameSegments, versionSegment);

  // start fresh
  await fsx.remove(cacheDir);
  await fsx.ensureDir(cacheDir);

  // install plugin into cacheDir
  if (spec.type === 'file' || spec.type === 'directory') {
    // local filesystem folder or file:
    let local = spec.fetchSpec!.replace(/^file:/, '');
    if (!path.isAbsolute(local)) local = path.resolve(root, local);
    logger.log(`Installing from local filesystem: ${local}`);
    await fsx.copy(local, cacheDir);
  } else {
    // npm registry, GitHub, tag, range, or tarball URL
    const fetchSpec = (spec.fetchSpec && spec.fetchSpec !== '*') ? spec.fetchSpec : specStr;
    logger.log(`Installing from npm/git/url: ${fetchSpec}`);
    await pacote.extract(fetchSpec, cacheDir);
  }

  // resolve package.json ESM entrypoint
  const pkgJson = fsx.readJsonSync(path.join(cacheDir, 'package.json'));
  const entry = pkgJson.exports?.['.']?.import || pkgJson.module || pkgJson.main;
  if (!entry) {
    throw new Error(`Cannot find ESM entry for plugin spec: ${specStr}`);
  }

  // load with Jiti to support ESM, TS, and CJS
  const entryPath = path.join(cacheDir, entry);
  logger.log(`Loading module via jiti at: ${entryPath}`);
  const jiti = createJiti(import.meta.url);
  const mod = jiti(entryPath) as any;
  return [mod.plugin as Plugin];
}
