import { Module } from '@nestjs/common';
import { IntrigReactBindingService } from './react-binding.service';

@Module({
  controllers: [],
  providers: [IntrigReactBindingService],
  exports: [IntrigReactBindingService],
})
export class IntrigReactBindingModule {}
