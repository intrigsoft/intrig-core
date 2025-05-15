import { Module } from '@nestjs/common';
import { ReactCliService } from './react-cli.service';

@Module({
  providers: [ReactCliService],
  exports: [ReactCliService]
})
export class ReactCliModule {}
