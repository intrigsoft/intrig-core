import {Controller, Get, Query, Param, NotFoundException} from '@nestjs/common';
import {ApiOperation, ApiQuery, ApiResponse} from '@nestjs/swagger';
import {Page, ResourceDescriptor} from "common";
import {DataSearchService} from "../services/data-search.service";

@Controller('data')
export class DataSearchController {

  constructor(private dataSearchService: DataSearchService) {
  }

  @Get("/search")
  @ApiOperation({summary: 'Search for resources'})
  @ApiQuery({name: 'query', required: false, type: String})
  @ApiQuery({name: 'page', required: false, type: Number})
  @ApiQuery({name: 'size', required: false, type: Number})
  @ApiResponse({status: 200, description: 'Returns paged list of resources'})
  async search(
    @Query('query') query?: string,
    @Query('page') page = 0,
    @Query('size') size = 10
  ): Promise<Page<ResourceDescriptor<any>>> {
    return await this.dataSearchService.search(query, page, size);
  }

  @Get("/:id")
  @ApiOperation({summary: 'Get resource by ID'})
  @ApiResponse({status: 200, description: 'Returns a resource'})
  @ApiResponse({status: 404, description: 'Resource not found'})
  async getById(@Param('id') id: string): Promise<ResourceDescriptor<any>> {
    const resource = await this.dataSearchService.getById(id);
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    return resource;
  }
}
