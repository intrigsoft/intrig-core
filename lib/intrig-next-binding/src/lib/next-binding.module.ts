import { Module } from '@nestjs/common';
import { IntrigNextBindingService } from './next-binding.service';
import { CommonModule } from '@intrig/common';
import { NextCliModule } from './cli/next-cli.module';

@Module({
  imports: [CommonModule, NextCliModule],
  controllers: [],
  providers: [IntrigNextBindingService],
  exports: [IntrigNextBindingService],
})
export class IntrigNextBindingModule {}
