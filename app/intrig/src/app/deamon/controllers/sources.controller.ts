import {Body, Controller, Delete, Get, Logger, NotFoundException, Param, Post, Res} from '@nestjs/common';
import {OpenapiService} from "../services/openapi.service";
import {IntrigSourceConfig} from "common";
import type {IIntrigSourceConfig} from "common";
import {IntrigConfigService} from "../services/intrig-config.service";
import {ApiBody, ApiExtraModels, ApiResponse, ApiTags} from "@nestjs/swagger";
import {Response} from 'express';
import {join} from 'path';
import {existsSync, readFileSync} from 'fs';
import {ConfigService} from '@nestjs/config';

type ICreateSourceDto = Pick<IntrigSourceConfig, 'specUrl'>;

class CreateSourceDto implements ICreateSourceDto {
  constructor(public specUrl: string) {
  }
}

@ApiTags('Sources')
@ApiExtraModels(IntrigSourceConfig)
@Controller('config/sources')
export class SourcesController {
  private readonly logger = new Logger(SourcesController.name);

  constructor(private configService: IntrigConfigService,
              private openApiService: OpenapiService,
              private nestConfigService: ConfigService) {
  }

  @ApiBody({
    type: CreateSourceDto
  })
  @ApiResponse({
    status: 201,
    type: IntrigSourceConfig
  })
  @Post("transform")
  async createFromUrl(@Body() dto: ICreateSourceDto): Promise<IntrigSourceConfig> {
    this.logger.log(`Creating source from URL: ${dto.specUrl}`);
    return this.openApiService.resolveSource(dto.specUrl);
  }

  @ApiBody({
    type: IntrigSourceConfig
  })
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

  @ApiResponse({
    status: 200,
    type: IntrigSourceConfig
  })
  @ApiResponse({
    status: 404,
    description: 'Source not found'
  })
  @Get(":id")
  getById(@Param('id') id: string): IntrigSourceConfig {
    this.logger.log(`Getting source with id: ${id}`);
    const source = this.configService.list().find(source => source.id === id);
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    return source;
  }

  @ApiResponse({
    status: 200,
    description: 'Downloads the OpenAPI3 file for the given source',
    headers: {
      'Content-Type': {
        description: 'application/json'
      },
      'Content-Disposition': {
        description: 'attachment; filename="openapi.json"'
      }
    },
    content: {
      'application/json': {
        schema: {
          type: 'object'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Source or OpenAPI file not found'
  })
  @Get(":id/download")
  downloadOpenApiFile(@Param('id') id: string, @Res() res: Response): void {
    this.logger.log(`Downloading OpenAPI file for source with id: ${id}`);
    
    // Check if source exists
    const source = this.configService.list().find(source => source.id === id);
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }

    // Construct file path
    const rootDir = this.nestConfigService.get('rootDir')!;
    const filePath = join(rootDir, '.intrig', 'specs', `${id}-latest.json`);

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new NotFoundException(`OpenAPI file for source ${id} not found`);
    }

    try {
      // Set response headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${id}-openapi.json"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
      
      // Send file content
      res.download(filePath, `${id}-openapi.json`, (err) => {
        if (err) {
          this.logger.error(`Failed to download OpenAPI file for source ${id}:`, err);
          throw new NotFoundException(`Failed to download OpenAPI file for source ${id}`);
        }
      });
      
      this.logger.log(`Successfully downloaded OpenAPI file for source ${id}`);
    } catch (error) {
      this.logger.error(`Failed to read OpenAPI file for source ${id}:`, error);
      throw new NotFoundException(`Failed to read OpenAPI file for source ${id}`);
    }
  }
}
