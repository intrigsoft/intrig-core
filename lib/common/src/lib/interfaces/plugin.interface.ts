import {Type} from "@nestjs/common";
import {GeneratorBinding} from "./generator.interface";
import {GeneratorCli} from "./generator-cli.interface";

export interface Plugin {
  name: string;
  bindingModule: Type;
  binding: Type<GeneratorBinding>,
  cliModule: Type;
  cli: Type<GeneratorCli>;
}