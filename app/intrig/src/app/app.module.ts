import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DeamonModule } from './deamon/deamon.module';
import {CommonModule} from "@intrig/common";
import {ConfigModule} from "@nestjs/config";
import configuration from "./config/configuration";

@Module({
  imports: [
    CommonModule,
    CliModule,
    DiscoveryModule,
    DeamonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    })
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
