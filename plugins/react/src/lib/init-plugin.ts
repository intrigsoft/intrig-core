import {InitContext, InitReturnValue} from '@intrig/plugin-sdk';
import chalk from 'chalk';

export type ReactPluginOptions = Record<string, never>;

export async function initPlugin(ctx: InitContext<ReactPluginOptions>): Promise<InitReturnValue> {
  // React plugin doesn't need any specific initialization tasks currently
  // But we return a postInit function to show instructions to the user
  
  return {
    postInit: () => {
      console.log(chalk.blue('\n📋 Next Steps:'));
      console.log(chalk.white('To complete your React setup, please refer to the post-initialization instructions at:'));
      console.log(chalk.cyan('https://intrig.dev/docs/react/initialization#3-post-initialization-steps'));
      console.log(chalk.gray('\nThis guide will show you how to add IntrigProvider to your React application.\n'));
    }
  };
}