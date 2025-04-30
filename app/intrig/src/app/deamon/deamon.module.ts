import { Module } from '@nestjs/common';
import { SourcesController } from './controllers/sources.controller';
import { CommonModule } from '@intrig/common';
import { IntrigConfigService } from './services/intrig-config.service';
import { OpenapiService } from './services/openapi.service';
import { OperationsController } from './controllers/operations.controller';
import { OperationsService } from './services/operations.service';

@Module({
  imports: [CommonModule],
  controllers: [SourcesController, OperationsController],
  providers: [IntrigConfigService, OpenapiService, OperationsService],
})
export class DeamonModule {}
