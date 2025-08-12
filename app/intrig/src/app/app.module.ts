import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DeamonModule } from './deamon/deamon.module';
import {CommonModule} from "common";
import {ConfigModule} from "@nestjs/config";
import configuration from "./config/configuration";
// import {McpModule} from "./mcp/mcp.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    CommonModule,
    CliModule,
    DiscoveryModule,
    DeamonModule,
    // McpModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
