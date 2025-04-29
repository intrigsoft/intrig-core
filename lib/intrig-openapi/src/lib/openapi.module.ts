import { Module } from '@nestjs/common';
import { IntrigOpenapiService } from './openapi.service';
import {HttpModule} from "@nestjs/axios";

@Module({
  imports: [
    HttpModule
  ],
  controllers: [],
  providers: [IntrigOpenapiService],
  exports: [IntrigOpenapiService],
})
export class IntrigOpenapiModule {}
