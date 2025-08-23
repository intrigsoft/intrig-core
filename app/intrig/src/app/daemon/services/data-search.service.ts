import { Injectable, Logger } from '@nestjs/common';
import {Page, ResourceDescriptor, RestData} from "common";
import {SearchService} from "./search.service";
import {LastVisitService} from "./last-visit.service";
import {PluginRegistryService} from "../../plugins/plugin-registry.service";

@Injectable()
export class DataSearchService {
  private readonly logger = new Logger(DataSearchService.name);
  constructor(
    private readonly searchService: SearchService,
    private pluginRegistryService: PluginRegistryService,
    // private generatorBinding: GeneratorBinding,
    private lastVisitService: LastVisitService
  ) {}

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

    // 1) Get the total count of all matching results using the new method
    const total = this.searchService.getTotalCount(query ?? '', opts);
    this.logger.debug(`Total matching results: ${total} (without pagination)`);
    
    // 2) Get the paginated results
    const startIdx = (page - 1) * size;
    const pageData: ResourceDescriptor<any>[] = this.searchService.search(query ?? '', { 
      limit: size, 
      offset: startIdx,
      ...opts 
    });

    // 3) Compute pagination metadata
    const totalPages = Math.ceil(total / size);

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

  async getDataStats(source?: string) {
    this.logger.debug(`Getting data stats${source ? ` for source: ${source}` : ''}`);
    return this.searchService.getDataStats(source);
  }

  async getSchemaDocsById(id: string) {
    this.logger.debug(`Getting resource by id: ${id}`);
    const result = this.searchService.getById(id);
    this.logger.debug(`Resource ${id} ${result ? 'found' : 'not found'}`);
    if (!result) return;
    
    // Track the schema view
    await this.lastVisitService.trackSchemaView(id, result.name, result.source);
    
    const dataTypes = this.searchService.search("", {
      dataTypes: [result.name],
      type: 'rest'
    });
    const instance = this.pluginRegistryService.instance;
    if (!instance) {
      this.logger.error('No plugin instance found');
      return;
    }
    const schemaDocumentation = await instance.getSchemaDocumentation(result);
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
    
    // Track the endpoint view
    await this.lastVisitService.trackEndpointView(id, result.name, result.source);
    
    const restData = result.data as RestData;
    const schemas = this.searchService.search("", {
      type: 'schema',
      names: [restData.requestBody, restData.response, ...restData.variables?.map(a => a.ref.split('/').pop()) ?? []]
        .filter(a => !!a).map(a => a as string)
    });
    const instance = this.pluginRegistryService.instance;
    if (!instance) {
      this.logger.error('No plugin instance found');
      return;
    }
    return await instance.getEndpointDocumentation(result, schemas);
  }
}