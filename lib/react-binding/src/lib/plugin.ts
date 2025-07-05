import {Plugin} from "@intrig/common";
import {ReactBindingModule} from "./react-binding.module";
import {ReactBindingService} from "./react-binding.service";
import {ReactCliModule} from "./cli/react-cli.module";
import {ReactCliService} from "./cli/react-cli.service";

export const plugin: Plugin = {
  name: 'react',
  bindingModule: ReactBindingModule,
  binding: ReactBindingService,
  cliModule: ReactCliModule,
  cli: ReactCliService,
}