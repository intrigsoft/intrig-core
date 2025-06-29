import { Module } from '@nestjs/common';
import { ProcessManagerService } from './process-manager.service';
import {DeamonCommand} from "./commands/deamon.command";
import {GenerateCommand} from "./commands/generate.command";
import {InitCommand} from "./commands/init.command";
import {SyncCommand} from "./commands/sync.command";
import {SourcesCommand} from "./commands/sources.command";
import {CommonModule} from "common";
import {DiscoveryModule} from "../discovery/discovery.module";
import {HttpModule} from "@nestjs/axios";
import {GENERATORS} from "./tokens";
import {SearchCommand} from "./commands/search.command";
import {loadInstalledPlugins} from "../plugins/plugin-loader";
import {PrebuildCommand} from "./commands/prebuild.command";
import {PostbuildCommand} from "./commands/postbuild.command";

const PLUGINS = loadInstalledPlugins();
const cliModules = PLUGINS.map(p => p.plugin.cliModule);
const cliServices = PLUGINS.map(p => p.plugin.cliService);

@Module({
  imports: [CommonModule, DiscoveryModule, HttpModule, ...cliModules],
  providers: [
    ProcessManagerService,
    ...DeamonCommand.registerWithSubCommands(),
    GenerateCommand,
    InitCommand,
    ...SourcesCommand.registerWithSubCommands(),
    SyncCommand,
    SearchCommand,
    HttpModule,
    PrebuildCommand,
    PostbuildCommand,
    ...cliServices,
    {
      provide: GENERATORS,
      inject: cliServices,
      useFactory: (...services: any[]) => services
    }
  ],
})
export class CliModule {}
