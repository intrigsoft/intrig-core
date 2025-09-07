import {InitContext, InitReturnValue} from '@intrig/plugin-sdk';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

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


export async function initPlugin(ctx: InitContext<NextPluginOptions>): Promise<InitReturnValue> {
  const { rootDir, options } = ctx;
  const apiRoutesDir = options?.apiRoutesDir || 'src/app/api';
  
  // Add the directory with (generated) to gitignore
  updateGitIgnore(rootDir, `${apiRoutesDir}/(generated)`);

  return {
    postInit: () => {
      console.log(chalk.blue('\n📋 Next Steps:'));
      console.log(chalk.white('To complete your Next.js setup, please refer to the post-initialization instructions at:'));
      console.log(chalk.cyan('https://intrig.dev/docs/next/initialization#3-post-initialization-steps'));
      console.log(chalk.gray('\nThis guide will show you how to add IntrigProvider to your Next.js application.\n'));
    }
  };
}