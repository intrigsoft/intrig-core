import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'node:path';
import { PluginManager } from 'live-plugin-manager';
import type { IntrigGeneratorPlugin } from '@intrig/plugin-sdk';

// Token for dependency injection
export const INTRIG_PLUGIN = Symbol('INTRIG_PLUGIN');
export const INTRIG_PLUGIN_NAME = Symbol('INTRIG_PLUGIN_NAME');

@Module({})
export class PluginModule {
  static forRootAsync(): DynamicModule {
    return {
      module: PluginModule,
      providers: [
        {
          provide: INTRIG_PLUGIN_NAME,
          useFactory: async (configService: ConfigService) => {
            const { pluginName } = await this.loadPlugin(configService);
            return pluginName;
          },
          inject: [ConfigService],
        },
        {
          provide: INTRIG_PLUGIN,
          useFactory: async (configService: ConfigService) => {
            const { pluginInstance } = await this.loadPlugin(configService);
            return pluginInstance;
          },
          inject: [ConfigService],
        },
      ],
      exports: [INTRIG_PLUGIN, INTRIG_PLUGIN_NAME],
      global: true,
    };
  }

  private static async loadPlugin(configService: ConfigService): Promise<{
    pluginName: string;
    pluginInstance: IntrigGeneratorPlugin;
  }> {
    const rootDir = configService.get<string>('rootDir') ?? process.cwd();
    console.log(`[DEBUG] Loading plugin from rootDir: ${rootDir}`);

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

    const pluginName = matchedPlugins[0];
    const pluginVersion = allDeps[pluginName];
    console.log(`[DEBUG] Found plugin: ${pluginName} with version/path: ${pluginVersion}`);

    // Check if plugin is a file-based dependency
    const isFileDependency = this.isFileBasedDependency(pluginVersion);
    console.log(`[DEBUG] Plugin is file-based: ${isFileDependency}`);

    try {
      // Initialize PluginManager with rootDir as the plugin directory
      const pluginManager = new PluginManager({
        pluginsPath: path.join(rootDir, 'plugins'),
        npmRegistryUrl: 'https://registry.npmjs.org',
        ignoredDependencies: ['@intrig/plugin-sdk'], // Skip SDK as it's already available
      });

      console.log(`[DEBUG] Attempting to load plugin using PluginManager: ${pluginName}`);
      
      let mod: any;
      
      try {
        // First try to require the plugin if it's already installed
        mod = pluginManager.require(pluginName);
        console.log(`[DEBUG] PluginManager require succeeded`);
      } catch (requireErr) {
        console.log(`[DEBUG] PluginManager require failed, attempting install: ${(requireErr as Error).message}`);
        
        if (isFileDependency) {
          // For file-based dependencies, resolve the path and use installFromPath
          const pluginPath = this.resolvePluginPath(rootDir, pluginVersion);
          console.log(`[DEBUG] Installing from path: ${pluginPath}`);
          await pluginManager.installFromPath(pluginPath);
        } else {
          // For npm-based dependencies, use regular install
          console.log(`[DEBUG] Installing from npm: ${pluginName}`);
          await pluginManager.install(pluginName);
        }
        
        mod = pluginManager.require(pluginName);
        console.log(`[DEBUG] PluginManager install and require succeeded`);
      }

      const factory = this.extractFactory(mod, pluginName);
      const instance: IntrigGeneratorPlugin = await Promise.resolve(factory());

      // Validate plugin instance
      if (!instance || typeof instance.meta !== 'function' || typeof instance.generate !== 'function') {
        throw new Error(
          `Plugin factory from "${pluginName}" did not return a valid Intrig plugin instance.`
        );
      }

      return { pluginName, pluginInstance: instance };
    } catch (err) {
      throw new Error(
        `Failed to load Intrig plugin "${pluginName}" using PluginManager: ${(err as Error).message}`
      );
    }
  }


  private static isFileBasedDependency(version: string): boolean {
    // Check for common file-based dependency patterns
    return version.startsWith('file:') || 
           version.startsWith('./') || 
           version.startsWith('../') || 
           version.startsWith('/') ||
           version.startsWith('link:');
  }

  private static resolvePluginPath(rootDir: string, pluginVersion: string): string {
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

  private static extractFactory(mod: any, pluginName: string) {
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