import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DeamonModule } from './deamon/deamon.module';
import {CommonModule} from "@intrig/common";

@Module({
  imports: [CliModule, CommonModule, DiscoveryModule, DeamonModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
