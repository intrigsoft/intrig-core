import { Module } from '@nestjs/common';
import { SourcesController } from './controllers/sources.controller';
import { CommonModule } from 'common';
import { IntrigConfigService } from './services/intrig-config.service';
import { OpenapiService } from './services/openapi.service';
import { OperationsController } from './controllers/operations.controller';
import { OperationsService } from './services/operations.service';
import { OpenapiSourceModule } from 'openapi-source';
import { HttpModule } from '@nestjs/axios';
import { DataSearchController } from './controllers/data-search.controller';
import { DataSearchService } from './services/data-search.service';
import { SearchService } from './services/search.service';
import { LastVisitService } from './services/last-visit.service';
import { LazyCodeAnalyzerService } from '../utils/lazy-code-analyzer.service';

@Module({
  imports: [
    CommonModule,
    OpenapiSourceModule,
    HttpModule,
  ],
  controllers: [SourcesController, OperationsController, DataSearchController],
  providers: [
    IntrigConfigService,
    OpenapiService,
    OperationsService,
    DataSearchService,
    SearchService,
    LastVisitService,
    LazyCodeAnalyzerService,
  ],
  exports: [OperationsService, IntrigConfigService],
})
export class DaemonModule {}
