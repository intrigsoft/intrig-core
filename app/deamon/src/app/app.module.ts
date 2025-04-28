import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiscoveryService } from './discovery/discovery.service';
import {ConfigModule} from "@nestjs/config";
import {DiscoveryModule} from "@nestjs/core";
import discoveryConfig from "./discovery/discovery.config";

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
          load: [discoveryConfig],
          envFilePath: '.env'
      }),
      DiscoveryModule
  ],
  controllers: [AppController],
  providers: [AppService, DiscoveryService],
})
export class AppModule {}
