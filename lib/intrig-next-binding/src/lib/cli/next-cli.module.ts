import { Module } from '@nestjs/common';
import { NextCliService } from './next-cli.service';

@Module({
  providers: [NextCliService],
  exports: [NextCliService],
})
export class NextCliModule {}
