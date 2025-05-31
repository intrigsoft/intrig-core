import { Injectable, Logger } from '@nestjs/common';
import {GeneratorBinding, Page, ResourceDescriptor, RestData} from "common";
import {SearchService} from "./search.service";

@Injectable()
export class DataSearchService {
  private readonly logger = new Logger(DataSearchService.name);
  constructor(private readonly searchService: SearchService, private generatorBinding: GeneratorBinding) {}

  /**
   * @param query  The search string; if falsy, returns recent descriptors
   * @param page   1-based page number
   * @param size   Number of items per page
   * @param opts
   */
  async search(
    query: string | undefined,
    page: number,
    size: number,
    opts?: any,
  ): Promise<Page<ResourceDescriptor<any>>> {
    this.logger.debug(`Searching with query: "${query}", page: ${page}, size: ${size}, opts: ${JSON.stringify(opts)}`);

    const maxResults = page * size;

    // 1) Get the raw, sorted list of descriptors
    const allResults: ResourceDescriptor<any>[] = this.searchService.search(query ?? '', { limit: maxResults, ...opts });

    // 2) Compute pagination metadata
    const total      = allResults.length;
    const totalPages = Math.ceil(total / size);
    const startIdx   = (page - 1) * size;
    const pageData   = allResults.slice(startIdx, startIdx + size);

    // 3) Return the Page<T>
    const result = Page.from({
      data: pageData,
      total,
      page,
      limit: size,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    });
    this.logger.debug(`Search results: ${total} total items, ${pageData.length} items on page ${page} of ${totalPages}`);
    return result;
  }

  async getById(id: string) {
    this.logger.debug(`Getting resource by id: ${id}`);
    const result = this.searchService.getById(id);
    this.logger.debug(`Resource ${id} ${result ? 'found' : 'not found'}`);
    if (!result) return;
    return result;
  }

  async getStats() {
    return this.searchService.getStatsBySource();
  }

  async getSchemaDocsById(id: string) {
    this.logger.debug(`Getting resource by id: ${id}`);
    const result = this.searchService.getById(id);
    this.logger.debug(`Resource ${id} ${result ? 'found' : 'not found'}`);
    if (!result) return;
    let dataTypes = this.searchService.search("", {
      dataTypes: [result.name],
      type: 'rest'
    });
    let schemaDocumentation = await this.generatorBinding.getSchemaDocumentation(result);
    schemaDocumentation.relatedEndpoints = dataTypes.map(d => ({
      id: d.id,
      name: d.name,
      method: d.data.method,
      path: d.data.requestUrl,
    }));
    return schemaDocumentation;
  }

  async getEndpointDocById(id: string) {
    this.logger.debug(`Getting resource by id: ${id}`);
    const result = this.searchService.getById(id);
    this.logger.debug(`Resource ${id} ${result ? 'found' : 'not found'}`);
    if (!result) return;
    let restData = result.data as RestData;
    let schemas = this.searchService.search("", {
      type: 'schema',
      names: [restData.requestBody, restData.response, ...restData.variables?.map(a => a.ref.split('/').pop()) ?? []]
        .filter(a => !!a).map(a => a as string)
    });
    return await this.generatorBinding.getEndpointDocumentation(result, schemas);
  }
}