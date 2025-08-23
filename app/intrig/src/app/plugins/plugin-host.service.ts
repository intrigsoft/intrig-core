import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import type { IntrigGeneratorPlugin } from '@intrig/plugin-sdk';
import { PluginRegistryService } from './plugin-registry.service';
import * as path from 'node:path';
import resolve from 'resolve';
import { pathToFileURL } from 'node:url';

@Injectable()
export class PluginHostService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PluginHostService.name);
  private selectedPluginName: string | null = null;
  private instance: IntrigGeneratorPlugin | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: PluginRegistryService,
  ) {}

  async onModuleDestroy() {
    // dispose plugin if supported
    try {
      await this.instance?.dispose?.();
    } catch (err) {
      this.logger.warn(`Error disposing plugin: ${(err as Error).message}`);
    }
  }

  async onModuleInit() {
    const rootDir = this.config.get<string>('rootDir') ?? process.cwd();
    const pkgPath = path.resolve(rootDir, 'package.json');

    let packageJson: any;
    try {
      const content = fs.readFileSync(pkgPath, 'utf8');
      packageJson = JSON.parse(content);
    } catch (e) {
      // If package.json cannot be read or parsed, silently skip plugin detection
      // as the requirement is only to detect and error on multiple when present.
      return;
    }

    const deps = Object.keys({
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.devDependencies ?? {}),
      ...(packageJson?.peerDependencies ?? {}),
      ...(packageJson?.optionalDependencies ?? {}),
    });

    // Match any of:
    // 1) @intrig/plugin-*
    // 2) @<any-scope>/intrig-plugin-*
    // 3) intrig-plugin-*
    const patterns: RegExp[] = [
      /^@intrig\/plugin-.+/,
      /^@[^/]+\/intrig-plugin-.+/,
      /^intrig-plugin-.+/,
    ];

    const matched = deps.filter((name) => patterns.some((re) => re.test(name)));

    if (matched.length > 1) {
      // Throw an error when multiple plugins detected
      throw new Error(
        `Multiple Intrig plugins detected in package.json: ${matched.join(
          ', '
        )}. Ensure only one plugin dependency is installed.`
      );
    }

    this.selectedPluginName = matched.length === 1 ? matched[0] : null;

    if (!this.selectedPluginName) {
      throw new Error('No Intrig plugin dependency found in package.json. Install one plugin such as "@intrig/plugin-react" or "@<scope>/intrig-plugin-..." or "intrig-plugin-...".');
    }

    // Dynamically resolve and load the plugin
    let mod: any;
    try {
      const pluginPath = await this.resolvePluginPath(rootDir, this.selectedPluginName);
      this.logger.debug(`Loading plugin from: ${pluginPath}`);

      // Use pathToFileURL for proper ESM import
      const pluginUrl = pathToFileURL(pluginPath).href;
      mod = await import(pluginUrl);
    } catch (err) {
      throw new Error(
        `Failed to load Intrig plugin module "${this.selectedPluginName}" from rootDir "${rootDir}": ${(err as Error).message}`,
      );
    }

    // Determine factory function: named createPlugin or default export
    let factory: any;

    if (typeof mod?.createPlugin === 'function') {
      factory = mod.createPlugin;
      this.logger.debug(`Using named export 'createPlugin' from plugin "${this.selectedPluginName}"`);
    } else if (typeof mod?.default === 'function') {
      factory = mod.default;
      this.logger.debug(`Using default export from plugin "${this.selectedPluginName}"`);
    } else {
      this.logger.error(`Plugin module exports:`, Object.keys(mod || {}));
      throw new Error(
        `Plugin "${this.selectedPluginName}" does not export a factory function. Expected "createPlugin()" or a default function export.`,
      );
    }

    const instance: IntrigGeneratorPlugin = await Promise.resolve(factory());

    // Basic shape validation
    if (!instance || typeof instance.meta !== 'function' || typeof instance.generate !== 'function') {
      throw new Error(
        `Plugin factory from "${this.selectedPluginName}" did not return a valid Intrig plugin instance.`,
      );
    }

    this.instance = instance;
    this.registry.register(this.selectedPluginName, instance);
    this.logger.log(`Loaded Intrig plugin: ${this.selectedPluginName}`);
  }

  private async resolvePluginPath(rootDir: string, pluginName: string): Promise<string> {
    // First, try to find the plugin in node_modules
    const nodeModulesPath = path.join(rootDir, 'node_modules', pluginName);

    if (fs.existsSync(nodeModulesPath)) {
      const pluginPackageJsonPath = path.join(nodeModulesPath, 'package.json');

      if (fs.existsSync(pluginPackageJsonPath)) {
        try {
          const pluginPackageJson = JSON.parse(fs.readFileSync(pluginPackageJsonPath, 'utf8'));
          this.logger.debug(`Plugin package.json loaded for: ${pluginName}`);

          // Priority order for file resolution (always prefer built versions)
          const candidateFiles: string[] = [];

          // Try exports field first (modern approach)
          if (pluginPackageJson.exports && pluginPackageJson.exports['.']) {
            const exports = pluginPackageJson.exports['.'];

            // Add built versions first (import, default)
            if (exports.import) candidateFiles.push(exports.import);
            if (exports.default && exports.default !== exports.import) candidateFiles.push(exports.default);

            // Add development version last as fallback
            if (exports.development && exports.development !== exports.import && exports.development !== exports.default) {
              candidateFiles.push(exports.development);
            }
          }

          // Add main/module fields as fallback
          if (pluginPackageJson.main) candidateFiles.push(pluginPackageJson.main);
          if (pluginPackageJson.module && pluginPackageJson.module !== pluginPackageJson.main) {
            candidateFiles.push(pluginPackageJson.module);
          }

          // Default fallback
          if (candidateFiles.length === 0) {
            candidateFiles.push('index.js');
          }

          this.logger.debug(`Candidate files for ${pluginName}:`, candidateFiles);

          // Try each candidate file in order
          for (const targetFile of candidateFiles) {
            const fullPath = path.resolve(nodeModulesPath, targetFile);
            this.logger.debug(`Checking file existence: ${fullPath}`);

            if (fs.existsSync(fullPath)) {
              this.logger.debug(`Found plugin file: ${fullPath}`);
              return fullPath;
            }
          }

          // If no files found, provide detailed error
          throw new Error(`Plugin file not found. Tried: ${candidateFiles.map(f => path.resolve(nodeModulesPath, f)).join(', ')}`);

        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.includes('Plugin file not found')) {
            throw parseErr; // Re-throw our custom error
          }
          throw new Error(`Failed to parse plugin package.json: ${(parseErr as Error).message}`);
        }
      }
    }

    // Fallback to resolve.sync if direct path resolution fails
    try {
      const resolved = resolve.sync(pluginName, {
        basedir: rootDir,
        preserveSymlinks: false,
      });
      this.logger.debug(`Resolved via resolve.sync: ${resolved}`);
      return resolved;
    } catch (resolveErr) {
      throw new Error(`Could not resolve plugin "${pluginName}" from "${rootDir}": ${(resolveErr as Error).message}`);
    }
  }
}