import { Module } from '@nestjs/common';
import {IntrigNextBindingService} from "./next-binding.service";
import {NextCliModule} from "./cli/next-cli.module";

@Module({
  controllers: [NextCliModule],
  providers: [IntrigNextBindingService],
  exports: [IntrigNextBindingService],
})
export class NextBindingModule {}
