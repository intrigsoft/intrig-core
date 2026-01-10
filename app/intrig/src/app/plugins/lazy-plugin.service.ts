/resimport { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'node:path';
import type { IntrigGeneratorPlugin } from '@intrig/plugin-sdk';

// Dynamic import that bypasses webpack transformation
// This is necessary because webpack transforms import() into __webpack_require__()
// which can't handle truly external modules from user's node_modules
const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (modulePath: string) => Promise<any>;

@Injectable()
export class LazyPluginService {
  private readonly logger = new Logger(LazyPluginService.name);
  private pluginInstance: IntrigGeneratorPlugin<any> | null = null;
  private pluginName: string | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(private configService: ConfigService) {}

  async getPlugin(): Promise<IntrigGeneratorPlugin<any>> {
    if (this.pluginInstance) {
      return this.pluginInstance;
    }

    if (this.isLoading && this.loadingPromise) {
      await this.loadingPromise;
      return this.pluginInstance!;
    }

    this.isLoading = true;
    this.loadingPromise = this.loadPlugin();
    
    try {
      await this.loadingPromise;
      return this.pluginInstance!;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  async getPluginName(): Promise<string> {
    if (this.pluginName) {
      return this.pluginName;
    }

    await this.getPlugin();
    return this.pluginName!;
  }

  /**
   * Returns the target library package name where generated SDK content should be copied.
   * Derived from the plugin's meta().generator field (e.g., 'react' -> '@intrig/react').
   */
  async getTargetLibrary(): Promise<string> {
    const plugin = await this.getPlugin();
    const meta = plugin.meta();
    return `@intrig/${meta.generator}`;
  }

  private async loadPlugin(): Promise<void> {
    const rootDir = this.configService.get<string>('rootDir') ?? process.cwd();
    this.logger.debug(`Loading plugin from rootDir: ${rootDir}`);

    const pkgPath = path.resolve(rootDir, 'package.json');
    let packageJson: any;
    try {
      const content = fs.readFileSync(pkgPath, 'utf8');
      packageJson = JSON.parse(content);
    } catch (e) {
      throw new Error(`Cannot read package.json from ${pkgPath}`);
    }

    const allDeps = {
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.devDependencies ?? {}),
      ...(packageJson?.peerDependencies ?? {}),
      ...(packageJson?.optionalDependencies ?? {}),
    };

    const pluginPatterns: RegExp[] = [
      /^@intrig\/plugin-.+/,
      /^@[^/]+\/intrig-plugin-.+/,
      /^intrig-plugin-.+/,
    ];

    const matchedPlugins = Object.keys(allDeps).filter((name) =>
      pluginPatterns.some((pattern) => pattern.test(name))
    );

    if (matchedPlugins.length > 1) {
      throw new Error(
        `Multiple Intrig plugins detected: ${matchedPlugins.join(', ')}. ` +
        'Ensure only one plugin dependency is installed.'
      );
    }

    if (matchedPlugins.length === 0) {
      throw new Error(
        'No Intrig plugin dependency found in package.json. ' +
        'Install one plugin such as "@intrig/plugin-react".'
      );
    }

    this.pluginName = matchedPlugins[0];
    const pluginVersion = allDeps[this.pluginName];
    this.logger.debug(`Found plugin: ${this.pluginName} with version/path: ${pluginVersion}`);

    // Check if plugin is a file-based dependency
    const isFileDependency = this.isFileBasedDependency(pluginVersion);
    this.logger.debug(`Plugin is file-based: ${isFileDependency}`);

    try {
      this.logger.debug(`Attempting to load plugin: ${this.pluginName}`);

      let mod: any;

      if (isFileDependency) {
        // For file-based dependencies, import from the resolved path
        const pluginPath = this.resolvePluginPath(rootDir, pluginVersion);
        this.logger.debug(`Importing from file path: ${pluginPath}`);
        mod = await dynamicImport(pluginPath);
      } else {
        // For npm-based dependencies, resolve the path first then import
        // This ensures we load from the project's node_modules, not the daemon's
        const { createRequire: nodeCreateRequire } = await dynamicImport('node:module');
        const projectRequire = nodeCreateRequire(path.resolve(rootDir, 'package.json'));
        const resolvedPath = projectRequire.resolve(this.pluginName);
        this.logger.debug(`Importing npm package from resolved path: ${resolvedPath}`);
        mod = await dynamicImport(resolvedPath);
      }

      this.logger.debug(`Module import succeeded`);

      const factory = this.extractFactory(mod, this.pluginName);
      this.pluginInstance = await Promise.resolve(factory());

      // Validate plugin instance
      if (!this.pluginInstance || typeof this.pluginInstance.meta !== 'function' || typeof this.pluginInstance.generate !== 'function') {
        throw new Error(
          `Plugin factory from "${this.pluginName}" did not return a valid Intrig plugin instance.`
        );
      }
    } catch (err) {
      throw new Error(
        `Failed to load Intrig plugin "${this.pluginName}": ${(err as Error).message}`
      );
    }
  }

  private isFileBasedDependency(version: string): boolean {
    // Check for common file-based dependency patterns
    return version.startsWith('file:') || 
           version.startsWith('./') || 
           version.startsWith('../') || 
           version.startsWith('/') ||
           version.startsWith('link:');
  }

  private resolvePluginPath(rootDir: string, pluginVersion: string): string {
    if (pluginVersion.startsWith('file:')) {
      // Remove 'file:' prefix and resolve relative to rootDir
      const relativePath = pluginVersion.slice(5);
      return path.resolve(rootDir, relativePath);
    } else if (pluginVersion.startsWith('link:')) {
      // Remove 'link:' prefix and resolve relative to rootDir
      const relativePath = pluginVersion.slice(5);
      return path.resolve(rootDir, relativePath);
    } else if (pluginVersion.startsWith('/')) {
      // Absolute path
      return pluginVersion;
    } else {
      // Relative path
      return path.resolve(rootDir, pluginVersion);
    }
  }

  private extractFactory(mod: any, pluginName: string) {
    if (typeof mod?.createPlugin === 'function') {
      return mod.createPlugin;
    } else if (typeof mod?.default === 'function') {
      return mod.default;
    } else if (typeof mod?.default?.createPlugin === 'function') {
      return mod.default.createPlugin;
    } else {
      throw new Error(
        `Plugin "${pluginName}" does not export a factory function. ` +
        `Expected "createPlugin()" or a default function export. ` +
        `Available exports: ${Object.keys(mod || {}).join(', ')}`
      );
    }
  }
}