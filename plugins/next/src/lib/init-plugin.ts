import {InitContext} from '@intrig/plugin-sdk';
import * as fs from 'fs';
import * as path from 'path';

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


export async function initPlugin(ctx: InitContext<NextPluginOptions>): Promise<void> {
  const { rootDir, options } = ctx;
  const apiRoutesDir = options?.apiRoutesDir || 'src/app/api';
  
  // Add the directory with (generated) to gitignore
  updateGitIgnore(rootDir, `${apiRoutesDir}/(generated)`);
}