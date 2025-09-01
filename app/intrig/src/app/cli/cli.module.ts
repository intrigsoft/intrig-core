import { Module } from '@nestjs/common';
import { ProcessManagerService } from './process-manager.service';
import { DaemonCommand } from './commands/daemon.command';
import { GenerateCommand } from './commands/generate.command';
import { InitCommand } from './commands/init.command';
import { SyncCommand } from './commands/sync.command';
import { SourcesCommand } from './commands/sources.command';
import { CommonModule } from 'common';
import { DiscoveryModule } from '../discovery/discovery.module';
import { HttpModule } from '@nestjs/axios';
import { SearchCommand } from './commands/search.command';
import { InsightCommand } from './commands/insight.command';
import { PrebuildCommand } from './commands/prebuild.command';
import { PostbuildCommand } from './commands/postbuild.command';
import { ViewCommand } from './commands/view.command';
import { DaemonModule } from '../daemon/daemon.module';
import { PluginModule } from '../plugins/plugin.module';

@Module({
  imports: [CommonModule, DiscoveryModule, HttpModule, DaemonModule, PluginModule.forRootAsync()],
  providers: [
    ProcessManagerService,
    ...DaemonCommand.registerWithSubCommands(),
    GenerateCommand,
    InitCommand,
    ...SourcesCommand.registerWithSubCommands(),
    SyncCommand,
    SearchCommand,
    ViewCommand,
    HttpModule,
    InsightCommand,
    PrebuildCommand,
    PostbuildCommand
  ],
})
export class CliModule {}
