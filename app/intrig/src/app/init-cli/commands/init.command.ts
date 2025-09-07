import { Command, CommandRunner } from 'nest-commander';
import * as path from 'path';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import inquirer from 'inquirer';
import * as semver from 'semver';
import chalk from 'chalk';
import ora from 'ora';
import * as schinquirer from 'schinquirer';
import { schemaTemplate } from '../templates/schema.template';

interface BasicIntrigConfig {
  $schema: string;
  sources: string[];
  generator: string;
  generatorOptions?: any;
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
      
      // Check for existing plugin dependency matching the plugin regex format
      const existingPlugin = this.checkForExistingPlugin(packageJson);
      
      let selectedPlugin: ApprovedPlugin;
      if (existingPlugin) {
        console.log(chalk.green(`✅ Found existing plugin dependency: ${existingPlugin.name}`));
        selectedPlugin = existingPlugin;
      } else {
        // Fetch approved plugins from GitHub
        const approvedPlugins = await this.fetchApprovedPlugins();
        
        // Prompt user to select plugin (show all plugins with best match as default)
        selectedPlugin = await this.promptUserForPlugin(approvedPlugins, packageJson);
      }
      
      // Load and initialize the selected plugin
      const { pluginInstance, generatorOptions } = await this.loadAndInitializePlugin(selectedPlugin);
      
      // Check if plugin loading failed
      if (!pluginInstance) {
        throw new Error(`Failed to load and initialize plugin ${selectedPlugin.name}. Please check the plugin installation and try again.`);
      }
      
      // Create .intrig directory if it doesn't exist
      const intrigDir = path.resolve(rootDir, '.intrig');
      if (!fs.existsSync(intrigDir)) {
        fs.mkdirSync(intrigDir, { recursive: true });
      }
      
      // Write schema file using template
      const spinner = ora('Writing configuration files...').start();
      
      // Create dump function for schema writing
      const dumpSchema = async (content: any) => {
        const resolved = await content;
        const fullPath = path.resolve(rootDir, resolved.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, resolved.content, 'utf-8');
      };
      
      // Use template to create schema
      await dumpSchema(schemaTemplate(pluginInstance));
      
      // Create intrig config
      const config: BasicIntrigConfig = {
        $schema: './.intrig/schema.json',
        sources: [],
        generator: pluginInstance.meta().generator
      };

      // Add generator options if they exist
      if (generatorOptions && Object.keys(generatorOptions).length > 0) {
        config.generatorOptions = generatorOptions;
      }

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

  private checkForExistingPlugin(packageJson: any): ApprovedPlugin | null {
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

    if (matchedPlugins.length > 0) {
      const pluginName = matchedPlugins[0];

      return {
        type: 'generator',
        generator: 'custom', // This will be overridden by the actual plugin meta
        name: pluginName,
        compat: {
          latest: {
            dependencies: {}
          }
        }
      };
    }

    return null;
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

  private async loadAndInitializePlugin(plugin: ApprovedPlugin): Promise<{pluginInstance: any, generatorOptions: any}> {
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
      
      // Now use createRequire to load the plugin
      const loadSpinner = ora(`Loading and initializing plugin: ${plugin.name}`).start();
      try {
        const { createRequire: nodeCreateRequire } = await import('node:module');
        const projectRequire = nodeCreateRequire(path.resolve(rootDir, 'package.json'));
        // Try to require the plugin (it should be installed by npm already)

        const pluginModule = projectRequire(plugin.name);
        
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
        
        // Collect generatorSchema information if plugin has one
        let generatorOptions = {};
        if (pluginInstance.$generatorSchema) {
          loadSpinner.text = 'Collecting generator configuration...';
          
          // Stop the spinner before collecting interactive input to prevent interference
          loadSpinner.stop();
          
          generatorOptions = await this.collectGeneratorOptions(pluginInstance.$generatorSchema, plugin.name);

          console.log("Generator options", generatorOptions)

          // Restart the spinner if we have more work to do
          loadSpinner.start();
        }

        // Call init function if it exists on the plugin instance
        if (typeof pluginInstance.init === 'function') {
          loadSpinner.text = 'Calling plugin init function...';
          await pluginInstance.init({
            options: generatorOptions,
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
        return { pluginInstance, generatorOptions };
      } catch (loadError: any) {
        loadSpinner.warn(`Plugin ${plugin.name} was installed but could not be loaded/initialized`);
        console.log(chalk.yellow('⚠️  Warning:'), loadError?.message);
        // Don't throw here - the plugin is installed which is the main requirement
        console.log(chalk.blue('ℹ️  Info: Plugin installation completed (initialization skipped due to loading issues)'));
        return { pluginInstance: null, generatorOptions: {} };
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

  private async collectGeneratorOptions(generatorSchema: any, pluginName: string): Promise<any> {
    const options: any = {};
    
    if (!generatorSchema.properties) {
      return options;
    }

    // Use schinquirer to generate questions from schema
    if (generatorSchema.properties && Object.keys(generatorSchema.properties).length > 0) {
      try {
        // Check if we're in a non-interactive environment
        if (!process.stdin.isTTY) {
          console.log(chalk.yellow(`⚠️  Non-interactive environment detected. Skipping generator configuration for plugin ${pluginName}.`));
          console.log(chalk.blue(`ℹ️  You can configure generator options later in intrig.config.json`));
          return options;
        }

        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Generator configuration timeout after 30 seconds')), 30000);
        });

        // Race between the prompt and timeout
        const answers = await Promise.race([
          schinquirer.prompt(generatorSchema.properties),
          timeoutPromise
        ]);
        
        Object.assign(options, answers);
      } catch (error: any) {
        console.log(chalk.yellow(`⚠️  Failed to collect generator configuration for plugin ${pluginName}: ${error.message}`));
        console.log(chalk.blue(`ℹ️  Continuing with default configuration. You can configure generator options later in intrig.config.json`));
      }
    }

    return options;
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