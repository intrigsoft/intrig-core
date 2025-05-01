import { Module } from '@nestjs/common';
import { SourcesController } from './controllers/sources.controller';
import { CommonModule } from '@intrig/common';
import { IntrigConfigService } from './services/intrig-config.service';
import { OpenapiService } from './services/openapi.service';
import { OperationsController } from './controllers/operations.controller';
import { OperationsService } from './services/operations.service';
import { GeneratorModule } from './generator/generator.module';
import { PackageManagerService } from './services/package-manager.service';
import {IntrigOpenapiModule} from "@intrig/openapi";
import {HttpModule} from "@nestjs/axios";

@Module({
  imports: [CommonModule, GeneratorModule.register(), IntrigOpenapiModule, HttpModule],
  controllers: [SourcesController, OperationsController],
  providers: [
    IntrigConfigService,
    OpenapiService,
    OperationsService,
    PackageManagerService,
  ],
})
export class DeamonModule {}
