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
import {NextCliModule, NextCliService} from "next-binding";
import {GENERATORS} from "./tokens";
import {SearchCommand} from "./commands/search.command";

@Module({
  imports: [CommonModule, DiscoveryModule, HttpModule, NextCliModule],
  providers: [
    ProcessManagerService,
    ...DeamonCommand.registerWithSubCommands(),
    GenerateCommand,
    InitCommand,
    ...SourcesCommand.registerWithSubCommands(),
    SyncCommand,
    SearchCommand,
    HttpModule,
    {
      provide: GENERATORS,
      inject: [NextCliService],
      useFactory(nextCliService: NextCliService) {
        return [nextCliService]
      }
    }
  ],
})
export class CliModule {}
