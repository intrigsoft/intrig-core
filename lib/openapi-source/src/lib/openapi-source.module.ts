import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import {IntrigOpenapiService} from "./openapi.service";
import {ExtractRequestsService} from "./util/extract-requests.service";

@Module({
  imports: [HttpModule],
  providers: [IntrigOpenapiService, ExtractRequestsService],
  exports: [IntrigOpenapiService],
})
export class OpenapiSourceModule {}
