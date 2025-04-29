import {Body, Controller, Delete, Get, Param, Post} from '@nestjs/common';
import { IntrigConfigSource } from "@intrig/common";
import {ConfigService} from "./config.service";
import {Openapi3Service} from "./openapi3.service";

type CreateSourceDto = Pick<IntrigConfigSource, 'specUrl'>;

@Controller('config/sources')
export class SourceController {
  constructor(private configService: ConfigService,
              private openApi3Service: Openapi3Service) {
  }


  @Post("transform")
  async createFromUrl(@Body() dto: CreateSourceDto): Promise<IntrigConfigSource> {
    return this.openApi3Service.resolveSource(dto.specUrl);
  }

  @Post("add")
  create(@Body() source: IntrigConfigSource): IntrigConfigSource {
    this.configService.add(source)
    return source;
  }


  @Delete("remove/:id")
  remove(@Param('id') id: string): void {
    this.configService.remove(id);
  }

  @Get("list")
  list(): IntrigConfigSource[] {
    return this.configService.list();
  }
}
