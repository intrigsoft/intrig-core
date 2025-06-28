export * from './lib/react-binding.service';
export * from './lib/react-binding.module';
export * from './lib/cli/react-cli.module'
export * from './lib/cli/react-cli.service'

import {IntrigPlugin} from '@intrig/common';
import {ReactBindingModule} from './lib/react-binding.module';
import {ReactBindingService} from './lib/react-binding.service';
import {ReactCliModule} from './lib/cli/react-cli.module';
import {ReactCliService} from './lib/cli/react-cli.service';

export const plugin: IntrigPlugin = {
  name: 'react',
  bindingModule: ReactBindingModule,
  bindingService: ReactBindingService,
  cliModule: ReactCliModule,
  cliService: ReactCliService,
};
export default plugin;
