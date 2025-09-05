import {InitContext} from '@intrig/plugin-sdk';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

export interface NextPluginOptions {
  apiRoutesDir?: string;
}

function updateGitIgnore(rootDir: string, entryToAdd: string): void {
  const gitIgnorePath = path.resolve(rootDir, '.gitignore');
  const gitIgnoreContent = fs.existsSync(gitIgnorePath) 
    ? fs.readFileSync(gitIgnorePath, 'utf-8').split('\n')
    : [];

  if (!gitIgnoreContent.includes(entryToAdd)) {
    gitIgnoreContent.push(entryToAdd);
    fs.writeFileSync(gitIgnorePath, gitIgnoreContent.join('\n'), 'utf-8');
  }
}

function updateIntrigConfig(rootDir: string, apiRoutesDir: string): void {
  const configPath = path.resolve(rootDir, 'intrig.config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.generatorOptions = config.generatorOptions || {};
    config.generatorOptions.apiRoutesDir = apiRoutesDir;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

export async function initPlugin(ctx: InitContext<NextPluginOptions>): Promise<void> {
  const { rootDir } = ctx;
  const defaultApiDir = path.resolve(rootDir, 'src/app/api');
  
  if (fs.existsSync(defaultApiDir)) {
    // Default src/app/api directory exists, add (generated) to gitignore
    updateGitIgnore(rootDir, 'src/app/api/(generated)');
  } else {
    // Ask user for apiRoutesDir
    const { apiRoutesDir } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiRoutesDir',
        message: 'Enter the API routes directory path:',
        default: 'src/app/api',
        validate: (input: string) => input.trim().length > 0 || 'Please enter a valid directory path'
      }
    ]);
    
    // Update intrig.config.json with the apiRoutesDir value
    updateIntrigConfig(rootDir, apiRoutesDir);
    
    // Add the directory with (generated) to gitignore
    updateGitIgnore(rootDir, `${apiRoutesDir}/(generated)`);
  }
}