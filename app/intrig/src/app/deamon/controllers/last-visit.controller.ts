import { Controller, Get, Param, Post, Delete } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LastVisitService } from '../services/last-visit.service';
import { LastVisitItem } from '../models/last-visit.model';

@Controller('api/last-visit')
@ApiExtraModels(LastVisitItem)
export class LastVisitController {
  constructor(private readonly lastVisitService: LastVisitService) {}

  /**
   * Get all recently viewed items
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get all recently viewed items' })
  @ApiResponse({ status: 200, description: 'Returns all recently viewed items', type: [LastVisitItem] })
  async getRecentItems(): Promise<LastVisitItem[]> {
    return this.lastVisitService.getItems();
  }

  /**
   * Get all pinned items
   */
  @Get('pinned')
  @ApiOperation({ summary: 'Get all pinned items' })
  @ApiResponse({ status: 200, description: 'Returns all pinned items', type: [LastVisitItem] })
  async getPinnedItems(): Promise<LastVisitItem[]> {
    return this.lastVisitService.getPinnedItems();
  }

  /**
   * Pin an item
   * @param id Item ID
   * @param type Item type
   */
  @Post('pin/:type/:id')
  @ApiOperation({ summary: 'Pin an item' })
  @ApiResponse({ status: 200, description: 'Item pinned successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiParam({ name: 'type', description: 'Item type', enum: ['schema', 'endpoint'] })
  async pinItem(
    @Param('id') id: string,
    @Param('type') type: 'schema' | 'endpoint',
  ): Promise<{ success: boolean }> {
    const result = await this.lastVisitService.pinItem(id, type);
    return { success: result };
  }

  /**
   * Unpin an item
   * @param id Item ID
   * @param type Item type
   */
  @Delete('pin/:type/:id')
  @ApiOperation({ summary: 'Unpin an item' })
  @ApiResponse({ status: 200, description: 'Item unpinned successfully' })
  @ApiResponse({ status: 404, description: 'Item not found or not pinned' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiParam({ name: 'type', description: 'Item type', enum: ['schema', 'endpoint'] })
  async unpinItem(
    @Param('id') id: string,
    @Param('type') type: 'schema' | 'endpoint',
  ): Promise<{ success: boolean }> {
    const result = await this.lastVisitService.unpinItem(id, type);
    return { success: result };
  }
}