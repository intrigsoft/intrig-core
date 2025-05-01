import { Module, Global } from '@nestjs/common';
import { SpecManagementService } from './spec-management.service';
import { SourceManagementService } from './source-management.service';

@Global()
@Module({
  controllers: [],
  providers: [SpecManagementService, SourceManagementService],
  exports: [SpecManagementService],
})
export class CommonModule {}
