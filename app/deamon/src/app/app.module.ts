import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiscoveryService } from './discovery/discovery.service';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { SourceController } from './config/source.controller';
import { ConfigService } from './config/config.service';
import discoveryConfig from './discovery/discovery.config';
import { HttpModule } from '@nestjs/axios';
import { Openapi3Service } from './config/openapi3.service';
import { OperationsController } from './operations/operations.controller';
import { OperationsService } from './operations/operations.service';
import { CommonModule } from '@intrig/common';
import { IntrigOpenapiModule } from '@intrig/openapi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [discoveryConfig],
      envFilePath: '.env',
    }),
    HttpModule,
    DiscoveryModule,
    CommonModule,
    IntrigOpenapiModule,
  ],
  controllers: [AppController, SourceController, OperationsController],
  providers: [
    AppService,
    DiscoveryService,
    ConfigService,
    Openapi3Service,
    OperationsService,
  ],
})
export class AppModule {}
