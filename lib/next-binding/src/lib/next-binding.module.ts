import { Module } from '@nestjs/common';
import {IntrigNextBindingService} from "./next-binding.service";

@Module({
  providers: [IntrigNextBindingService],
  exports: [IntrigNextBindingService],
})
export class NextBindingModule {}
