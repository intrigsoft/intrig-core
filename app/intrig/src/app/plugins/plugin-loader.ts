import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { Logger } from '@nestjs/common';
import { IntrigPlugin } from '@intrig/common';

const require = createRequire(import.meta.url);

export function loadInstalledPlugins(rootDir = process.cwd()): IntrigPlugin[] {
  const logger = new Logger('PluginLoader');
  const baseDir = path.join(rootDir, 'node_modules', '@intrig');
  if (!fs.existsSync(baseDir)) {
    logger.warn(`No @intrig directory found in node_modules`);
    return [];
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const plugins: IntrigPlugin[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.endsWith('-binding')) {
      const pkgName = `@intrig/${entry.name}`;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(pkgName);
        const plugin = (mod.default ?? mod.plugin) as IntrigPlugin | undefined;
        if (plugin) {
          plugins.push(plugin);
        } else {
          logger.warn(`No plugin export found in ${pkgName}`);
        }
      } catch (e) {
        logger.error(`Failed to load plugin ${pkgName}`, e as any);
      }
    }
  }

  return plugins;
}
