import { Module } from '@nestjs/common';
import { ProcessManagerService } from './process-manager.service';
import {DeamonCommand} from "./commands/deamon.command";
import {GenerateCommand} from "./commands/generate.command";
import {InitCommand} from "./commands/init.command";
import {SyncCommand} from "./commands/sync.command";
import {SourcesCommand} from "./commands/sources.command";
import {CommonModule} from "@intrig/common";

@Module({
  imports: [CommonModule],
  providers: [ProcessManagerService, DeamonCommand, GenerateCommand, InitCommand, SourcesCommand, SyncCommand],
})
export class CliModule {}
