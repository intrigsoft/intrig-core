import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import inquirer from 'inquirer';
import { PluginManager } from 'live-plugin-manager';
import * as semver from 'semver';

interface BasicIntrigConfig {
  $schema: string;
  sources: string[];
  generator: string;
}

interface ApprovedPlugin {
  type: string;
  generator: string;
  name: string;
  compat: {
    latest: {
      dependencies: Record<string, string>;
    };
  };
}

interface PluginChoice {
  name: string;
  value: ApprovedPlugin;
}

@Command({ name: 'init', description: 'Initialize Intrig setup' })
export class InitCommand extends CommandRunner {
  private readonly logger = new Logger(InitCommand.name);

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    this.logger.log('Initializing Intrig setup...');

    const rootDir = process.cwd();
    
    try {
      // Read package.json to determine project type
      const packageJsonPath = path.resolve(rootDir, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.error('package.json not found in current directory');
        throw new Error('package.json not found');
      }

      const packageJson = fsx.readJsonSync(packageJsonPath);
      
      // Fetch approved plugins from GitHub
      const approvedPlugins = await this.fetchApprovedPlugins();
      
      // Prompt user to select plugin (show all plugins with best match as default)
      const selectedPlugin = await this.promptUserForPlugin(approvedPlugins, packageJson);
      
      // Load and initialize the selected plugin
      await this.loadAndInitializePlugin(selectedPlugin);
      
      // Create intrig config
      const config: BasicIntrigConfig = {
        $schema: 'https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/schema.json',
        sources: [],
        generator: selectedPlugin.generator
      };

      // Write config file
      const configPath = path.resolve(rootDir, 'intrig.config.json');
      this.logger.debug('Writing config file...');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Update .gitignore
      this.updateGitIgnore(rootDir);

      this.logger.log('Intrig initialization completed successfully');
      
    } catch (error: any) {
      this.logger.error('Failed to initialize Intrig:', error?.message);
      throw error;
    }
  }

  private async fetchApprovedPlugins(): Promise<ApprovedPlugin[]> {
    this.logger.debug('Fetching approved plugins from GitHub...');
    const url = 'https://raw.githubusercontent.com/intrigsoft/intrig-core/main/registry/approved.json';
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch approved plugins: ${response.statusText}`);
      }
      
      const plugins = await response.json();
      return plugins as ApprovedPlugin[];
    } catch (error: any) {
      this.logger.error('Failed to fetch approved plugins:', error?.message);
      throw error;
    }
  }


  private isVersionCompatible(projectVersion: string, requiredVersion: string): boolean {
    try {
      // Clean project version (remove ^ ~ >= etc.)
      const cleanProjectVersion = semver.coerce(projectVersion);
      if (!cleanProjectVersion) {
        return false;
      }

      // Handle custom "x.x.x+" format by converting to ">=x.x.x"
      let normalizedRequiredVersion = requiredVersion;
      if (requiredVersion.endsWith('+')) {
        normalizedRequiredVersion = `>=${requiredVersion.slice(0, -1)}`;
      }

      // Check if project version satisfies the required version range
      return semver.satisfies(cleanProjectVersion.version, normalizedRequiredVersion);
    } catch (error) {
      // If semver parsing fails, fall back to string comparison
      this.logger.warn(`Failed to parse version: ${projectVersion} vs ${requiredVersion}`);
      return projectVersion === requiredVersion;
    }
  }

  private calculateCompatibilityScore(plugin: ApprovedPlugin, projectDependencies: Record<string, string>): number {
    let score = 0;
    const requiredDeps = plugin.compat.latest.dependencies;

    for (const [depName, requiredVersion] of Object.entries(requiredDeps)) {
      if (depName in projectDependencies) {
        const projectVersion = projectDependencies[depName];
        if (this.isVersionCompatible(projectVersion, requiredVersion)) {
          score++;
        }
      }
    }

    return score;
  }

  private async promptUserForPlugin(allPlugins: ApprovedPlugin[], packageJson: any): Promise<ApprovedPlugin> {
    const projectDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Calculate compatibility scores for all plugins and sort them
    const pluginsWithScores = allPlugins.map(plugin => ({
      plugin,
      score: this.calculateCompatibilityScore(plugin, projectDependencies)
    })).sort((a, b) => b.score - a.score);
    
    // Find the best matching plugin (highest score) for default selection
    const bestMatch = pluginsWithScores[0]?.plugin;
    
    const choices: PluginChoice[] = pluginsWithScores.map(({ plugin, score }) => ({
      name: `${plugin.name} (${plugin.generator}) - Compatible with: ${Object.keys(plugin.compat.latest.dependencies).join(', ')} ${score > 0 ? `[Score: ${score}]` : '[No matches]'}`,
      value: plugin
    }));

    choices.push({
      name: 'Custom dependency name',
      value: null as any
    });

    const { selectedPlugin } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPlugin',
        message: 'Select a plugin for your project:',
        choices: choices,
        default: bestMatch
      }
    ]);

    if (selectedPlugin === null) {
      const { customName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customName',
          message: 'Enter custom dependency name:',
          validate: (input: string) => input.trim().length > 0 || 'Please enter a valid dependency name'
        }
      ]);

      const { generator } = await inquirer.prompt([
        {
          type: 'input',
          name: 'generator',
          message: 'Enter generator name:',
          default: 'custom',
          validate: (input: string) => input.trim().length > 0 || 'Please enter a valid generator name'
        }
      ]);

      return {
        type: 'generator',
        generator: generator,
        name: customName,
        compat: {
          latest: {
            dependencies: {}
          }
        }
      };
    }

    return selectedPlugin;
  }

  private async loadAndInitializePlugin(plugin: ApprovedPlugin): Promise<void> {
    this.logger.log(`Loading plugin: ${plugin.name}`);
    
    try {
      const manager = new PluginManager();
      
      // Install and require the plugin
      await manager.install(plugin.name);
      const pluginModule = manager.require(plugin.name);
      
      // Call init function if it exists
      if (pluginModule && typeof pluginModule.init === 'function') {
        this.logger.debug('Calling plugin init function...');
        await pluginModule.init();
      }
      
      this.logger.log(`Plugin ${plugin.name} loaded successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to load plugin ${plugin.name}:`, error?.message);
      throw error;
    }
  }

  private updateGitIgnore(rootDir: string): void {
    const gitIgnorePath = path.resolve(rootDir, '.gitignore');
    const gitIgnoreContent = fs.existsSync(gitIgnorePath) 
      ? fs.readFileSync(gitIgnorePath, 'utf-8').split('\n')
      : [];

    if (!gitIgnoreContent.includes('.intrig/generated')) {
      this.logger.debug('Updating .gitignore file...');
      gitIgnoreContent.push('.intrig/generated');
      fs.writeFileSync(gitIgnorePath, gitIgnoreContent.join('\n'), 'utf-8');
    }
  }
}