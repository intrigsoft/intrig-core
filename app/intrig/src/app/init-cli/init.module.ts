import { Module } from '@nestjs/common';
import { InitCommand } from './commands/init.command';
import {ConfigModule} from "@nestjs/config";
import configuration from "../config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    })
  ],
  providers: [InitCommand],
})
export class InitModule {}
