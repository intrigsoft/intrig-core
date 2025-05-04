import { Module } from '@nestjs/common';
import { ReactBindingService } from './react-binding.service';

@Module({
  controllers: [],
  providers: [ReactBindingService],
  exports: [ReactBindingService],
})
export class ReactBindingModule {}
