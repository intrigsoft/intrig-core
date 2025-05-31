import {Controller, Get, Query, Param, NotFoundException, UsePipes, ValidationPipe} from '@nestjs/common';
import {ApiExtraModels, ApiOperation, ApiResponse, getSchemaPath} from '@nestjs/swagger';
import {Page, ResourceDescriptor, RestDocumentation, SchemaDocumentation} from "common";
import {DataSearchService} from "../services/data-search.service";
import {SourceStats} from "../models/source-stats";
import {SearchQuery} from "../models/search-query";

@Controller('data')
@ApiExtraModels(ResourceDescriptor, Page, SchemaDocumentation, RestDocumentation, SourceStats, SearchQuery)
export class DataSearchController {

  constructor(private dataSearchService: DataSearchService) {
  }

  @Get("/search")
  @ApiOperation({summary: 'Search for resources'})
  @ApiResponse({status: 200, description: 'Returns paged list of resources', schema: {
      allOf: [
        { $ref: getSchemaPath(Page) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(ResourceDescriptor) }
            }
          }
        }
      ]
    }})
  @UsePipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true}, whitelist: true }))
  async search(
    @Query() params: SearchQuery,
  ): Promise<Page<ResourceDescriptor<any>>> {
    const { query, type, source, pkg, page, size } = params;
    return await this.dataSearchService.search(query, page, size, {
      type, source, pkg
    });
  }

  @Get("/get/:id")
  @ApiOperation({summary: 'Get resource by ID'})
  @ApiResponse({status: 200, description: 'Returns a resource', type: ResourceDescriptor})
  @ApiResponse({status: 404, description: 'Resource not found'})
  async getById(@Param('id') id: string): Promise<ResourceDescriptor<any>> {
    const resource = await this.dataSearchService.getById(id);
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    return resource;
  }

  @Get("/get/schema/:id")
  @ApiOperation({summary: 'Get schema docs by ID'})
  @ApiResponse({status: 200, description: 'Returns a resource', type: SchemaDocumentation})
  @ApiResponse({status: 404, description: 'Resource not found'})
  async getSchemaDocsById(@Param('id') id: string): Promise<SchemaDocumentation> {
    const resource = await this.dataSearchService.getSchemaDocsById(id);
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    return resource;
  }

  @Get("/get/endpoint/:id")
  @ApiOperation({summary: 'Get schema docs by ID'})
  @ApiResponse({status: 200, description: 'Returns a resource', type: RestDocumentation})
  async getEndpointById(@Param('id') id: string): Promise<RestDocumentation> {
    const resource = await this.dataSearchService.getEndpointDocById(id);
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    return resource;
  }

  @Get("/stats")
  @ApiOperation({summary: 'Get stats for a source'})
  @ApiResponse({status: 200, description: 'Returns stats for a source', type: SourceStats})
  async getStats(): Promise<SourceStats> {
    return await this.dataSearchService.getStats();
  }
}
