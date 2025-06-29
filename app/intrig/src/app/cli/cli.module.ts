import {DynamicModule, Module, Type} from '@nestjs/common';
import { ProcessManagerService } from './process-manager.service';
import {DeamonCommand} from "./commands/deamon.command";
import {GenerateCommand} from "./commands/generate.command";
import {InitCommand} from "./commands/init.command";
import {SyncCommand} from "./commands/sync.command";
import {SourcesCommand} from "./commands/sources.command";
import {CommonModule, GeneratorBinding} from "common";
import {DiscoveryModule} from "../discovery/discovery.module";
import {HttpModule} from "@nestjs/axios";
import {GENERATORS} from "./tokens";
import {SearchCommand} from "./commands/search.command";
import {PrebuildCommand} from "./commands/prebuild.command";
import {PostbuildCommand} from "./commands/postbuild.command";
import {loadDynamicModules} from "../loadDynamicModules";

@Module({})
export class CliModule {
  static async registerAsync(): Promise<DynamicModule> {

    const plugins = await loadDynamicModules();

    return {
      module: CliModule,
      imports: [CommonModule, DiscoveryModule, HttpModule, ...plugins.map(a => a.cliModule)],
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
        {
          provide: GENERATORS,
          inject: plugins.map(a => a.cli),
          useFactory(...services: Type<GeneratorBinding>[]) {
            return services
          }
        }
      ],
    };
  }
}
