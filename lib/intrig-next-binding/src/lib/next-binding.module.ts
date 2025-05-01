import { Module } from '@nestjs/common';
import { IntrigNextBindingService } from './next-binding.service';

@Module({
  controllers: [],
  providers: [IntrigNextBindingService],
  exports: [IntrigNextBindingService],
})
export class IntrigNextBindingModule {}
