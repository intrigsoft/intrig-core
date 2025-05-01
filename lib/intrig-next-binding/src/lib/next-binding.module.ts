import { Module } from '@nestjs/common';
import { IntrigNextBindingService } from './next-binding.service';
import {CommonModule} from "@intrig/common";

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [IntrigNextBindingService],
  exports: [IntrigNextBindingService],
})
export class IntrigNextBindingModule {}
