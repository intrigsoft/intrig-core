export * from './lib/next-binding.module';
export * from './lib/next-binding.service';
export * from './lib/cli/next-cli.module'
export * from './lib/cli/next-cli.service'

import {IntrigPlugin} from '@intrig/common';
import {NextBindingModule} from './lib/next-binding.module';
import {IntrigNextBindingService} from './lib/next-binding.service';
import {NextCliModule} from './lib/cli/next-cli.module';
import {NextCliService} from './lib/cli/next-cli.service';

export const plugin: IntrigPlugin = {
  name: 'next',
  bindingModule: NextBindingModule,
  bindingService: IntrigNextBindingService,
  cliModule: NextCliModule,
  cliService: NextCliService,
};
export default plugin;
