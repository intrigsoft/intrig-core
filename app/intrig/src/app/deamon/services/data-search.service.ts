import { Injectable, Logger } from '@nestjs/common';
import {Page, ResourceDescriptor} from "common";
import {SearchService} from "./search.service";

@Injectable()
export class DataSearchService {
  private readonly logger = new Logger(DataSearchService.name);
  constructor(private readonly searchService: SearchService) {}

  /**
   * @param query  The search string; if falsy, returns recent descriptors
   * @param page   1-based page number
   * @param size   Number of items per page
   */
  async search(
    query: string | undefined,
    page: number,
    size: number
  ): Promise<Page<ResourceDescriptor<any>>> {
    this.logger.debug(`Searching with query: "${query}", page: ${page}, size: ${size}`);

    const maxResults = page * size;

    // 1) Get the raw, sorted list of descriptors
    const allResults: ResourceDescriptor<any>[] = query && query.trim()
      ? this.searchService.search(query, { limit: maxResults })
      : this.searchService.getRecent(maxResults);

    // 2) Compute pagination metadata
    const total      = allResults.length;
    const totalPages = Math.ceil(total / size);
    const startIdx   = (page - 1) * size;
    const pageData   = allResults.slice(startIdx, startIdx + size);

    // 3) Return the Page<T>
    const result = {
      data: pageData,
      total,
      page,
      limit: size,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
    this.logger.debug(`Search results: ${total} total items, ${pageData.length} items on page ${page} of ${totalPages}`);
    return result;
  }

  async getById(id: string) {
    this.logger.debug(`Getting resource by id: ${id}`);
    const result = this.searchService.getById(id);
    this.logger.debug(`Resource ${id} ${result ? 'found' : 'not found'}`);
    return result;
  }
}
