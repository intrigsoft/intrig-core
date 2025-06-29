import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { Logger } from '@nestjs/common';
import { IntrigPlugin } from '@intrig/common';

export interface LoadedPlugin {
  plugin: IntrigPlugin;
  config: any;
}

const require = createRequire(import.meta.url);

export function loadInstalledPlugins(rootDir = process.cwd()): LoadedPlugin[] {
  const logger = new Logger('PluginLoader');
  const nodeModules = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    logger.warn(`node_modules directory not found`);
    return [];
  }

  const packages: string[] = [];
  for (const entry of fs.readdirSync(nodeModules, { withFileTypes: true })) {
    const entryPath = path.join(nodeModules, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      for (const sub of fs.readdirSync(entryPath, { withFileTypes: true })) {
        if (sub.isDirectory()) {
          packages.push(`${entry.name}/${sub.name}`);
        }
      }
    } else {
      packages.push(entry.name);
    }
  }

  const plugins: LoadedPlugin[] = [];

  for (const pkgName of packages) {
    try {
      const pkgJsonPath = path.join(nodeModules, pkgName, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const pluginCfg = pkgJson.intrig?.plugin;
      if (!pluginCfg) continue;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(path.join(nodeModules, pkgName));
      const plugin = (mod.default ?? mod.plugin) as IntrigPlugin | undefined;
      if (plugin) {
        plugins.push({ plugin, config: pluginCfg });
      } else {
        logger.warn(`No plugin export found in ${pkgName}`);
      }
    } catch (e) {
      logger.error(`Failed to load plugin ${pkgName}`, e as any);
    }
  }

  return plugins;
}
