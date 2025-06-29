import { Module, Global } from '@nestjs/common';
import { SpecManagementService } from './spec-management.service';
import { SourceManagementService } from './source-management.service';
import { PackageManagerService } from './package-manager.service';

@Global()
@Module({
  controllers: [],
  providers: [
    SpecManagementService,
    SourceManagementService,
    PackageManagerService,
  ],
  exports: [SpecManagementService, SourceManagementService, PackageManagerService],
})
export class CommonModule {}
