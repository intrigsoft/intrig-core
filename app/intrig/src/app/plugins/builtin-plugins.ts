import {IntrigPlugin} from "common";
import {ReactBindingModule, ReactBindingService, ReactCliModule, ReactCliService} from '@intrig/react-binding';
import {NextBindingModule, IntrigNextBindingService, NextCliModule, NextCliService} from '@intrig/next-binding';

export const BUILTIN_PLUGINS: IntrigPlugin[] = [
  {
    name: 'react',
    bindingModule: ReactBindingModule,
    bindingService: ReactBindingService,
    cliModule: ReactCliModule,
    cliService: ReactCliService,
  },
  {
    name: 'next',
    bindingModule: NextBindingModule,
    bindingService: IntrigNextBindingService,
    cliModule: NextCliModule,
    cliService: NextCliService,
  },
];
