import { Command, CommandRunner } from 'nest-commander';
import * as path from 'path';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import inquirer from 'inquirer';
import { PluginManager } from 'live-plugin-manager';
import * as semver from 'semver';
import chalk from 'chalk';
import ora from 'ora';

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

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    console.log(chalk.blue('🚀 Initializing Intrig setup...'));

    const rootDir = process.cwd();
    
    try {
      // Read package.json to determine project type
      const packageJsonPath = path.resolve(rootDir, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        console.log(chalk.red('❌ package.json not found in current directory'));
        throw new Error('package.json not found');
      }

      const packageJson = fsx.readJsonSync(packageJsonPath);
      
      // Fetch approved plugins from GitHub
      const approvedPlugins = await this.fetchApprovedPlugins();
      
      // Prompt user to select plugin (show all plugins with best match as default)
      const selectedPlugin = await this.promptUserForPlugin(approvedPlugins, packageJson);
      
      // Load and initialize the selected plugin
      const pluginInstance = await this.loadAndInitializePlugin(selectedPlugin);
      
      // Create .intrig directory if it doesn't exist
      const intrigDir = path.resolve(rootDir, '.intrig');
      if (!fs.existsSync(intrigDir)) {
        fs.mkdirSync(intrigDir, { recursive: true });
      }
      
      // Create the base schema
      const baseSchema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
          "$schema": "./.intrig/schema.json",
          "sources": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "specUrl": { "type": "string", "format": "uri" }
              },
              "required": ["id", "name", "specUrl"],
              "additionalProperties": false
            },
            "minItems": 1
          },
          "generator": {
            "type": "string",
            "enum": ["react", "vue", "angular", "svelte"]
          },
          "codeAnalyzer": {
            "type": "object",
            "properties": {
              "tsConfigPath": { "type": "string" }
            },
            "required": ["tsConfigPath"],
            "additionalProperties": false
          },
          "generatorOptions": {
            "type": "object"
          }
        },
        "required": ["sources", "generator"],
        "additionalProperties": false
      };
      
      // Add generatorOptions if plugin has $generatorSchema
      if (pluginInstance && pluginInstance.$generatorSchema) {
        baseSchema.properties.generatorOptions = pluginInstance.$generatorSchema;
      }
      
      // Write schema file
      const spinner = ora('Writing configuration files...').start();
      const schemaPath = path.resolve(intrigDir, 'schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify(baseSchema, null, 2), 'utf-8');
      
      // Create intrig config
      const config: BasicIntrigConfig = {
        $schema: './.intrig/schema.json',
        sources: [],
        generator: selectedPlugin.generator
      };

      // Write config file
      const configPath = path.resolve(rootDir, 'intrig.config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Add config file to git
      this.addConfigToGit(rootDir);

      // Update .gitignore
      this.updateGitIgnore(rootDir);

      spinner.succeed('Configuration files created successfully');
      console.log(chalk.green('✅ Intrig initialization completed successfully'));
      
    } catch (error: any) {
      console.log(chalk.red('❌ Failed to initialize Intrig:'), error?.message);
      throw error;
    }
  }

  private async fetchApprovedPlugins(): Promise<ApprovedPlugin[]> {
    const spinner = ora('Fetching approved plugins from registry...').start();
    const url = 'https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/registry.json';
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch approved plugins: ${response.statusText}`);
      }
      
      const plugins = await response.json();
      spinner.succeed('Successfully fetched approved plugins');
      return plugins as ApprovedPlugin[];
    } catch (error: any) {
      spinner.fail('Failed to fetch approved plugins');
      console.log(chalk.red('❌ Error:'), error?.message);
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
      console.log(chalk.yellow('⚠️  Warning: Failed to parse version:'), `${projectVersion} vs ${requiredVersion}`);
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

  private async loadAndInitializePlugin(plugin: ApprovedPlugin): Promise<any> {
    const installSpinner = ora(`Installing plugin: ${plugin.name}`).start();
    
    try {
      const rootDir = process.cwd();
      
      // First, install the plugin in the project directory using npm
      const { execSync } = await import('child_process');
      
      try {
        // Use npm to install the plugin in the project directory as dev dependency
        execSync(`npm install --save-dev ${plugin.name}`, { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
        installSpinner.text = `Installing @intrig/core as dev dependency...`;
        
        // Install @intrig/core as a dev dependency
        execSync('npm install --save-dev @intrig/core', { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
        installSpinner.succeed(`Plugin ${plugin.name} and @intrig/core installed successfully`);
      } catch (npmError: any) {
        installSpinner.fail(`Failed to install plugin ${plugin.name}`);
        console.log(chalk.red('❌ Error:'), npmError?.message);
        throw new Error(`Failed to install plugin ${plugin.name}: ${npmError?.message}`);
      }
      
      // Now use PluginManager to load the plugin (same mechanism as LazyPluginService)
      const loadSpinner = ora(`Loading and initializing plugin: ${plugin.name}`).start();
      try {
        // Initialize PluginManager with rootDir as the plugin directory
        const pluginManager = new PluginManager({
          pluginsPath: path.join(rootDir, 'plugins'),
          npmRegistryUrl: 'https://registry.npmjs.org',
          cwd: rootDir,
        });

        // Try to require the plugin (it should be installed by npm already)
        const pluginModule = pluginManager.require(plugin.name);
        
        // Extract the factory function from the module
        const factory = this.extractFactory(pluginModule, plugin.name);
        
        // Create the plugin instance
        const pluginInstance = await Promise.resolve(factory());

        // Validate plugin instance
        if (!pluginInstance || typeof pluginInstance.meta !== 'function' || typeof pluginInstance.generate !== 'function') {
          throw new Error(
            `Plugin factory from "${plugin.name}" did not return a valid Intrig plugin instance.`
          );
        }
        
        // Call init function if it exists on the plugin instance
        if (typeof pluginInstance.init === 'function') {
          loadSpinner.text = 'Calling plugin init function...';
          await pluginInstance.init({
            options: {}, // generatorOptions would be set here if available
            rootDir: rootDir,
            buildDir: path.resolve(rootDir, '.intrig', 'generated'),
            dump: async (content: any) => {
              const resolved = await content;
              const fullPath = path.resolve(rootDir, resolved.path);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, resolved.content, 'utf-8');
            }
          });
        }
        
        loadSpinner.succeed(`Plugin ${plugin.name} loaded and initialized successfully`);
        return pluginInstance;
      } catch (loadError: any) {
        loadSpinner.warn(`Plugin ${plugin.name} was installed but could not be loaded/initialized`);
        console.log(chalk.yellow('⚠️  Warning:'), loadError?.message);
        // Don't throw here - the plugin is installed which is the main requirement
        console.log(chalk.blue('ℹ️  Info: Plugin installation completed (initialization skipped due to loading issues)'));
        return null;
      }
      
    } catch (error: any) {
      console.log(chalk.red('❌ Failed to install plugin'), `${plugin.name}:`, error?.message);
      throw error;
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

  private addConfigToGit(rootDir: string): void {
    try {
      const { execSync } = require('child_process');
      
      // Check if git repository exists
      try {
        execSync('git rev-parse --git-dir', { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
      } catch {
        console.log(chalk.blue('ℹ️  Info: No git repository found, skipping git add'));
        return;
      }
      
      // Add the config files to git
      execSync('git add intrig.config.json .intrig/schema.json', { 
        cwd: rootDir, 
        stdio: 'pipe' 
      });
      
      console.log(chalk.green('✅ Successfully added intrig.config.json and .intrig/schema.json to git'));
    } catch (error: any) {
      console.log(chalk.yellow('⚠️  Warning: Failed to add config files to git:'), error?.message);
      // Don't throw - git operations are optional
    }
  }

  private updateGitIgnore(rootDir: string): void {
    const gitIgnorePath = path.resolve(rootDir, '.gitignore');
    const gitIgnoreContent = fs.existsSync(gitIgnorePath) 
      ? fs.readFileSync(gitIgnorePath, 'utf-8').split('\n')
      : [];

    const entriesToAdd = ['.intrig/generated', '.intrig/.config'];
    let needsUpdate = false;

    for (const entry of entriesToAdd) {
      if (!gitIgnoreContent.includes(entry)) {
        gitIgnoreContent.push(entry);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log(chalk.green('✅ Updating .gitignore file...'));
      fs.writeFileSync(gitIgnorePath, gitIgnoreContent.join('\n'), 'utf-8');
    }
  }
}