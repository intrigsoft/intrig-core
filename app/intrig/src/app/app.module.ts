import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DaemonModule } from './daemon/daemon.module';
import { CommonModule } from 'common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PluginModule } from './plugins/plugin.module';
import {InitModule} from "./init-cli/init.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    PluginModule.forRootAsync(),
    CliModule,
    DiscoveryModule,
    DaemonModule,
    InitModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
