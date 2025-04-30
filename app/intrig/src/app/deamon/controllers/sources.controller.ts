import {Body, Controller, Delete, Get, Param, Post} from '@nestjs/common';
import {OpenapiService} from "../services/openapi.service";
import {IntrigConfigSource} from "@intrig/common";
import {IntrigConfigService} from "../services/intrig-config.service";
import {ApiTags} from "@nestjs/swagger";

type CreateSourceDto = Pick<IntrigConfigSource, 'specUrl'>;

@ApiTags('Sources')
@Controller('config/sources')
export class SourcesController {
  constructor(private configService: IntrigConfigService,
              private openApiService: OpenapiService) {
  }

  @Post("transform")
  async createFromUrl(@Body() dto: CreateSourceDto): Promise<IntrigConfigSource> {
    return this.openApiService.resolveSource(dto.specUrl);
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
