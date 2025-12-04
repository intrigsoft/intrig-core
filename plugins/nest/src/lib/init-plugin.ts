import {InitContext, InitReturnValue} from '@intrig/plugin-sdk';
import chalk from 'chalk';

export type NestPluginOptions = {
  baseURL?: string;
};

export async function initPlugin(ctx: InitContext<NestPluginOptions>): Promise<InitReturnValue> {
  // NestJS plugin doesn't need any specific initialization tasks currently
  // But we return a postInit function to show instructions to the user

  return {
    postInit: () => {
      console.log(chalk.blue('\n📋 Next Steps:'));
      console.log(chalk.white('To complete your NestJS setup, import the generated IntrigModule into your app.module.ts:'));
      console.log(chalk.cyan('\n  import { IntrigModule } from \'@intrig/nest\';'));
      console.log(chalk.cyan('\n  @Module({'));
      console.log(chalk.cyan('    imports: [IntrigModule],'));
      console.log(chalk.cyan('  })'));
      console.log(chalk.gray('\nThe generated services will be available for dependency injection.\n'));
    }
  };
}
