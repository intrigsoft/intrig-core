import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import type { IntrigGeneratorPlugin } from '@intrig/plugin-sdk';
import { PluginRegistryService } from './plugin-registry.service';
import * as path from 'node:path';
import resolve from 'resolve';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

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
      return;
    }

    const deps = Object.keys({
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.devDependencies ?? {}),
      ...(packageJson?.peerDependencies ?? {}),
      ...(packageJson?.optionalDependencies ?? {}),
    });

    const pluginPatterns: RegExp[] = [
      /^@intrig\/plugin-.+/,
      /^@[^/]+\/intrig-plugin-.+/,
      /^intrig-plugin-.+/,
    ];

    const matchedPlugins = deps.filter((name) =>
      pluginPatterns.some((pattern) => pattern.test(name))
    );

    if (matchedPlugins.length > 1) {
      throw new Error(
        `Multiple Intrig plugins detected in package.json: ${matchedPlugins.join(', ')}. ` +
        'Ensure only one plugin dependency is installed.'
      );
    }

    this.selectedPluginName = matchedPlugins.length === 1 ? matchedPlugins[0] : null;

    if (!this.selectedPluginName) {
      throw new Error(
        'No Intrig plugin dependency found in package.json. ' +
        'Install one plugin such as "@intrig/plugin-react" or "@<scope>/intrig-plugin-..." or "intrig-plugin-...".'
      );
    }

    // Load the plugin
    try {
      const pluginPath = await this.resolvePluginPath(rootDir, this.selectedPluginName);
      this.logger.debug(`Resolved plugin path: ${pluginPath}`);
      const mod = await this.importPlugin(pluginPath, rootDir);
      const factory = this.extractFactory(mod);

      const instance: IntrigGeneratorPlugin = await Promise.resolve(factory());

      // Validate plugin instance
      if (!instance || typeof instance.meta !== 'function' || typeof instance.generate !== 'function') {
        throw new Error(
          `Plugin factory from "${this.selectedPluginName}" did not return a valid Intrig plugin instance.`
        );
      }

      this.instance = instance;
      this.registry.register(this.selectedPluginName, instance);
      this.logger.log(`Loaded Intrig plugin: ${this.selectedPluginName}`);

    } catch (err) {
      throw new Error(
        `Failed to load Intrig plugin module "${this.selectedPluginName}" from rootDir "${rootDir}": ${(err as Error).message}`
      );
    }
  }

  private async resolvePluginPath(rootDir: string, pluginName: string): Promise<string> {
    const nodeModulesPath = path.join(rootDir, 'node_modules', pluginName);

    if (fs.existsSync(nodeModulesPath)) {
      const pluginPackageJsonPath = path.join(nodeModulesPath, 'package.json');

      if (fs.existsSync(pluginPackageJsonPath)) {
        try {
          const pluginPackageJson = JSON.parse(fs.readFileSync(pluginPackageJsonPath, 'utf8'));
          const candidateFiles = this.getCandidateFiles(pluginPackageJson);

          // Try each candidate file in order
          for (const targetFile of candidateFiles) {
            const fullPath = path.resolve(nodeModulesPath, targetFile);
            if (fs.existsSync(fullPath)) {
              // Resolve symlinks to get the real path
              return fs.realpathSync(fullPath);
            }
          }

          throw new Error(
            `Plugin file not found. Tried: ${candidateFiles.map(f => path.resolve(nodeModulesPath, f)).join(', ')}`
          );

        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.includes('Plugin file not found')) {
            throw parseErr;
          }
          throw new Error(`Failed to parse plugin package.json: ${(parseErr as Error).message}`);
        }
      }
    }

    // Fallback to resolve.sync
    try {
      return resolve.sync(pluginName, {
        basedir: rootDir,
        preserveSymlinks: false,
      });
    } catch (resolveErr) {
      throw new Error(`Could not resolve plugin "${pluginName}" from "${rootDir}": ${(resolveErr as Error).message}`);
    }
  }

  private getCandidateFiles(pluginPackageJson: any): string[] {
    const candidateFiles: string[] = [];

    // Try exports field first (modern approach)
    if (pluginPackageJson.exports && pluginPackageJson.exports['.']) {
      const exports = pluginPackageJson.exports['.'];

      // For CommonJS contexts, prefer require over import
      if (exports.require) candidateFiles.push(exports.require);
      if (exports.import && exports.import !== exports.require) {
        candidateFiles.push(exports.import);
      }
      if (exports.default &&
          exports.default !== exports.require &&
          exports.default !== exports.import) {
        candidateFiles.push(exports.default);
      }

      // Add development version as fallback
      if (exports.development &&
          !candidateFiles.includes(exports.development)) {
        candidateFiles.push(exports.development);
      }
    }

    // Add main/module fields as fallback
    if (pluginPackageJson.main && !candidateFiles.includes(pluginPackageJson.main)) {
      candidateFiles.push(pluginPackageJson.main);
    }
    if (pluginPackageJson.module &&
        pluginPackageJson.module !== pluginPackageJson.main &&
        !candidateFiles.includes(pluginPackageJson.module)) {
      candidateFiles.push(pluginPackageJson.module);
    }

    // Default fallback
    if (candidateFiles.length === 0) {
      candidateFiles.push('index.js');
    }

    return candidateFiles;
  }

  private async importPlugin(pluginPath: string, rootDir: string): Promise<any> {
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin file does not exist: ${pluginPath}`);
    }

    // Try different import strategies
    const strategies = [
      { name: 'fileUrl', fn: () => this.importWithFileUrl(pluginPath) },
      { name: 'relativePath', fn: () => this.importWithRelativePath(pluginPath) },
      { name: 'absolutePath', fn: () => this.importWithAbsolutePath(pluginPath) },
      { name: 'createRequire', fn: () => this.importWithCreateRequire(pluginPath, rootDir) },
    ];

    const errors: string[] = [];

    for (const strategy of strategies) {
      try {
        const result = await strategy.fn();
        this.logger.debug(`Plugin imported successfully using ${strategy.name} strategy`);
        return result;
      } catch (error) {
        errors.push(`${strategy.name}: ${(error as Error).message}`);
      }
    }

    throw new Error(
      `All import methods failed. Errors: ${errors.join('; ')}. ` +
      `This may be a CommonJS/ESM compatibility issue.`
    );
  }

  private async importWithFileUrl(pluginPath: string): Promise<any> {
    const pluginUrl = pathToFileURL(pluginPath).href;
    return await import(pluginUrl);
  }

  private async importWithRelativePath(pluginPath: string): Promise<any> {
    const relativePath = path.relative(process.cwd(), pluginPath);
    const relativeImportPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    return await import(relativeImportPath);
  }

  private async importWithAbsolutePath(pluginPath: string): Promise<any> {
    return await import(pluginPath);
  }

  private async importWithCreateRequire(pluginPath: string, rootDir: string): Promise<any> {
    const require = createRequire(path.join(rootDir, 'package.json'));

    let resolvedPath: string;
    try {
      resolvedPath = require.resolve(this.selectedPluginName!);
    } catch {
      resolvedPath = pluginPath;
    }

    const moduleUrl = pathToFileURL(resolvedPath).href;

    // Use eval to avoid bundler issues with dynamic imports in CommonJS context
    const importFn = new Function('specifier', 'return import(specifier)');
    return await importFn(moduleUrl);
  }

  private extractFactory(mod: any) {
    if (typeof mod?.createPlugin === 'function') {
      return mod.createPlugin;
    } else if (typeof mod?.default === 'function') {
      return mod.default;
    } else {
      throw new Error(
        `Plugin "${this.selectedPluginName}" does not export a factory function. ` +
        'Expected "createPlugin()" or a default function export.'
      );
    }
  }
}