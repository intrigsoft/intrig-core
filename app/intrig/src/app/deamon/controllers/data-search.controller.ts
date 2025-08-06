import {Controller, Get, Post, Delete, Query, Param, NotFoundException, UsePipes, ValidationPipe, HttpCode, HttpStatus, Body} from '@nestjs/common';
import {ApiExtraModels, ApiOperation, ApiResponse, ApiQuery, getSchemaPath, ApiBody} from '@nestjs/swagger';
import {Page, ResourceDescriptor, RestDocumentation, SchemaDocumentation} from "common";
import {DataSearchService} from "../services/data-search.service";
import {SourceStats} from "../models/source-stats";
import {DataStats} from "../models/data-stats";
import {SearchQuery} from "../models/search-query";
import {LastVisitService} from "../services/last-visit.service";
import {EntityView} from "../models/entity-view.model";
import {PinItemDto} from "../models/pin-item.dto";
import {FileListResponseDto} from "../models/file-list-response.dto";
import { CodeAnalyzer } from "../../utils/code-analyzer";

@Controller('data')
@ApiExtraModels(ResourceDescriptor, Page, SchemaDocumentation, RestDocumentation, SourceStats, DataStats, SearchQuery, EntityView, PinItemDto, FileListResponseDto)
export class DataSearchController {

  constructor(
    private dataSearchService: DataSearchService,
    private lastVisitService: LastVisitService,
    private codeAnalyzer: CodeAnalyzer
  ) {
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

  @Get("/data-stats")
  @ApiOperation({summary: 'Get data statistics including source count, endpoint count, and data type count'})
  @ApiResponse({status: 200, description: 'Returns data statistics', type: DataStats})
  async getDataStats(@Query('source') source?: string): Promise<DataStats> {
    return await this.dataSearchService.getDataStats(source);
  }

  @Get("/last-visited")
  @ApiOperation({summary: 'Get the last visited items'})
  @ApiResponse({status: 200, description: 'Returns the last visited items', type: [EntityView]})
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of items to return (default: 10)' })
  @ApiQuery({ name: 'type', required: false, enum: ['schema', 'endpoint'], description: 'Filter by item type' })
  async getLastVisitedItems(
    @Query('limit') limit?: number,
    @Query('type') type?: 'schema' | 'endpoint'
  ): Promise<EntityView[]> {
    return await this.lastVisitService.getLastNItems(limit, type);
  }

  @Get("/pinned")
  @ApiOperation({summary: 'Get all pinned items'})
  @ApiResponse({status: 200, description: 'Returns all pinned items', type: [EntityView]})
  @ApiQuery({ name: 'type', required: false, enum: ['schema', 'endpoint'], description: 'Filter by item type' })
  async getPinnedItems(
    @Query('type') type?: 'schema' | 'endpoint'
  ): Promise<EntityView[]> {
    return await this.lastVisitService.getPinnedItems(type);
  }

  @Post("/toggle-pin")
  @ApiOperation({summary: 'Toggle pin status of an item'})
  @ApiResponse({status: 200, description: 'Item pin status toggled successfully', type: [PinItemDto]})
  @ApiResponse({status: 404, description: 'Item not found or missing required parameters'})
  @ApiBody({ type: PinItemDto })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async togglePinItem(
    @Body() pinItemDto: PinItemDto
  ): Promise<PinItemDto> {
    const { id, type, source, name } = pinItemDto;
    
    const result = await this.lastVisitService.togglePinItem(id, type, source, name);
    if (!result.success) {
      throw new NotFoundException(`Item with id ${id} and type ${type} not found and source not provided`);
    }
    return pinItemDto;
  }

  @Post("/pin")
  @ApiOperation({summary: 'Pin an item', deprecated: true})
  @ApiResponse({status: 200, description: 'Item pinned successfully'})
  @ApiResponse({status: 404, description: 'Item not found or missing required parameters'})
  @ApiBody({ type: PinItemDto })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async pinItem(
    @Body() pinItemDto: PinItemDto
  ): Promise<{ success: boolean, message: string }> {
    const { id, type, source, name } = pinItemDto;
    
    const success = await this.lastVisitService.pinItem(id, type, source, name);
    if (!success) {
      throw new NotFoundException(`Item with id ${id} and type ${type} not found and source not provided`);
    }
    return { success, message: `Item ${id} pinned successfully` };
  }

  @Delete("/pin")
  @ApiOperation({summary: 'Unpin an item', deprecated: true})
  @ApiResponse({status: 200, description: 'Item unpinned successfully'})
  @ApiResponse({status: 404, description: 'Item not found or not pinned or missing required parameters'})
  @HttpCode(HttpStatus.OK)
  async unpinItem(
    @Query('id') id: string,
    @Query('type') type: 'schema' | 'endpoint'
  ): Promise<{ success: boolean, message: string }> {
    if (!id || !type) {
      throw new NotFoundException('Missing required parameters: id and type are required');
    }
    
    const success = await this.lastVisitService.unpinItem(id, type);
    if (!success) {
      throw new NotFoundException(`Pinned item with id ${id} and type ${type} not found`);
    }
    return { success, message: `Item ${id} unpinned successfully` };
  }

  @Get("/files")
  @ApiOperation({summary: 'Get list of files per endpoint/datatype'})
  @ApiResponse({status: 200, description: 'Returns list of files where the endpoint/datatype is used', type: FileListResponseDto})
  @ApiResponse({status: 404, description: 'Resource not found or missing required parameters'})
  @ApiQuery({ name: 'sourceId', required: true, type: String, description: 'Source identifier' })
  @ApiQuery({ name: 'type', required: true, enum: ['endpoint', 'datatype'], description: 'Type of resource' })
  @ApiQuery({ name: 'id', required: true, type: String, description: 'Endpoint or datatype identifier' })
  async getFileList(
    @Query('sourceId') sourceId: string,
    @Query('type') type: 'endpoint' | 'datatype',
    @Query('id') id: string
  ): Promise<FileListResponseDto> {
    if (!sourceId || !type || !id) {
      throw new NotFoundException('Missing required parameters: sourceId, type, and id are required');
    }
    
    const files = this.codeAnalyzer.getFileList(sourceId, type, id);
    return new FileListResponseDto(files);
  }
}
