import { Module, Global } from '@nestjs/common';
import { SpecManagementService } from './spec-management.service';

@Global()
@Module({
  controllers: [],
  providers: [SpecManagementService],
  exports: [SpecManagementService],
})
export class CommonModule {}
