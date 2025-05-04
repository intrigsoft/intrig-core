import { Module } from '@nestjs/common';
import { SourcesController } from './controllers/sources.controller';
import { CommonModule } from '@intrig/common';
import { IntrigConfigService } from './services/intrig-config.service';
import { OpenapiService } from './services/openapi.service';
import { OperationsController } from './controllers/operations.controller';
import { OperationsService } from './services/operations.service';
import { GeneratorModule } from './generator/generator.module';
import { OpenapiSourceModule } from 'openapi-source';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    CommonModule,
    GeneratorModule.register(),
    OpenapiSourceModule,
    HttpModule,
  ],
  controllers: [SourcesController, OperationsController],
  providers: [
    IntrigConfigService,
    OpenapiService,
    OperationsService,
  ],
})
export class DeamonModule {}
