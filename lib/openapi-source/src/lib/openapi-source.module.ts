import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import {IntrigOpenapiService} from "./openapi.service";

@Module({
  imports: [HttpModule],
  providers: [IntrigOpenapiService],
  exports: [IntrigOpenapiService],
})
export class OpenapiSourceModule {}
