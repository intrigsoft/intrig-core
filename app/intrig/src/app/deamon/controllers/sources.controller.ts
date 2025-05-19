import {Body, Controller, Delete, Get, Logger, Param, Post} from '@nestjs/common';
import {OpenapiService} from "../services/openapi.service";
import {IntrigSourceConfig} from "common";
import type {IIntrigSourceConfig} from "common";
import {IntrigConfigService} from "../services/intrig-config.service";
import {ApiExtraModels, ApiResponse, ApiTags} from "@nestjs/swagger";

type CreateSourceDto = Pick<IntrigSourceConfig, 'specUrl'>;

@ApiTags('Sources')
@ApiExtraModels(IntrigSourceConfig)
@Controller('config/sources')
export class SourcesController {
  private readonly logger = new Logger(SourcesController.name);

  constructor(private configService: IntrigConfigService,
              private openApiService: OpenapiService) {
  }

  @ApiResponse({
    status: 201,
    type: IntrigSourceConfig
  })
  @Post("transform")
  async createFromUrl(@Body() dto: CreateSourceDto): Promise<IntrigSourceConfig> {
    this.logger.log(`Creating source from URL: ${dto.specUrl}`);
    return this.openApiService.resolveSource(dto.specUrl);
  }

  @ApiResponse({
    status: 201,
    type: IntrigSourceConfig
  })
  @Post("add")
  create(@Body() source: IIntrigSourceConfig): IntrigSourceConfig {
    this.logger.log(`Adding new source with id: ${source}`);
    this.configService.add(IntrigSourceConfig.from(source))
    return source;
  }

  @ApiResponse({
    status: 204
  })
  @Delete("remove/:id")
  remove(@Param('id') id: string): void {
    this.logger.log(`Removing source with id: ${id}`);
    this.configService.remove(id);
  }

  @ApiResponse({
    status: 200,
    type: [IntrigSourceConfig]
  })
  @Get("list")
  list(): IntrigSourceConfig[] {
    this.logger.log('Listing all sources');
    return this.configService.list();
  }
}
