import {Plugin} from "common";
import {NextBindingModule} from "./next-binding.module";
import {IntrigNextBindingService} from "./next-binding.service";
import {NextCliModule} from "./cli/next-cli.module";
import {NextCliService} from "./cli/next-cli.service";

export const plugin: Plugin = {
  bindingModule: NextBindingModule,
  binding: IntrigNextBindingService,
  cliModule: NextCliModule,
  cli: NextCliService,
  name: 'next'
}