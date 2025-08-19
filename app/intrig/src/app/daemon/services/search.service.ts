import {Injectable, OnModuleInit} from '@nestjs/common';
import MiniSearch from 'minisearch';
import {isRestDescriptor, isSchemaDescriptor, ResourceDescriptor, RestData, Schema} from 'common';
import {IntrigConfigService} from "./intrig-config.service";
import {IntrigOpenapiService} from "openapi-source";
import {SourceStats} from "../models/source-stats";
import {DataStats} from "../models/data-stats";
import _ from "lodash";
import { CodeAnalyzer } from "../../utils/code-analyzer";

export interface SearchOptions {
  /** fuzzy tolerance: 0–1 */
  fuzzy?: number;
  /** maximum number of results */
  limit?: number;
  /** starting index for pagination */
  offset?: number;
  type?: string;
  pkg?: string;
  source?: string;
  dataTypes?: string[];
  names?: string[];
}

@Injectable()
export class SearchService implements OnModuleInit {
  private mini: MiniSearch<{
    id: string;
    name: string;
    type: string;
    source: string;
    path: string;
    method?: string;
    package?: string;
    operationId?: string;
    summary?: string;
    description?: string;
    lastAccessed: number;
    dataTypes?: string[];
  }>;

  /** In-memory map of all descriptors */
  private descriptors = new Map<string, ResourceDescriptor<any>>();

  /** Weight on text relevance vs. recency */
  private readonly alpha = 0.75;

  /** Half-life in hours for recency decay */
  private readonly halfLifeHours = 24;

  constructor(
    private configService: IntrigConfigService,
    private openApiService: IntrigOpenapiService,
    private codeAnalyzer: CodeAnalyzer
  ) {
    this.mini = new MiniSearch({
      fields: [
        'name',
        'method',
        'package',
        'operationId',
        'summary',
        'description',
        '__all__',
        'dataTypes'
      ],
      storeFields: [
        'id',
        'name',
        'type',
        'source',
        'path',
        'lastAccessed',
        '__all__',
        'dataTypes',
      ],
      idField: 'id',
    });
  }

  async onModuleInit() {
    try {
      for (const source of this.configService.get().sources) {
        const {descriptors} = await this.openApiService.getResourceDescriptors(source.id);
        descriptors.forEach(descriptor => this.addDescriptor(descriptor));
      }
      
      // Update the CodeAnalyzer with all descriptors
      this.updateCodeAnalyzer();
      
      // Perform initial code analysis
      this.reindexCodebase();
    } catch (e) { /* empty */ }
  }
  
  /**
   * Update the CodeAnalyzer with the current descriptors
   */
  private updateCodeAnalyzer(): void {
    const descriptors = Array.from(this.descriptors.values());
    this.codeAnalyzer.setResourceDescriptors(descriptors);
  }
  
  /**
   * Trigger reindexing of the codebase
   */
  public reindexCodebase(): void {
    // Focus analysis on app/insight directory where React components are likely to be
    this.codeAnalyzer.reindex(['app/insight/src/**/*.ts', 'app/insight/src/**/*.tsx']);
  }


  /**
   * Add a new descriptor to the index (or re-index an updated one).
   */
  addDescriptor<T>(desc: ResourceDescriptor<T>) {
    this.descriptors.set(desc.id, desc);
    this.indexDescriptor(desc);
    
    // Update the CodeAnalyzer with the updated descriptors
    this.updateCodeAnalyzer();
  }

  /**
   * Get a descriptor by its ID.
   */
  getById(id: string): ResourceDescriptor<any> | undefined {
    return this.descriptors.get(id);
  }

  /**
   * Completely remove a descriptor from both the lookup map and the search index.
   */
  removeDescriptor(id: string) {
    // 1) Remove from the in-memory map
    this.descriptors.delete(id);
    // 2) Remove from MiniSearch
    //    (we used remove({ id }) when re-indexing, so same signature here)
    const desc = this.descriptors.get(id);
    if (desc) {
      const base = {
        id: desc.id,
        name: desc.name,
        type: desc.type,
        source: desc.source,
        path: desc.path,
        lastAccessed: desc.lastAccessed ?? 0,
      };
      if (this.mini.has(base)) {
        this.mini.remove(base);
      }
    }
    
    // Update the CodeAnalyzer with the updated descriptors
    this.updateCodeAnalyzer();
  }

  /**
   * (Optional) Clear the entire index and map.
   */
  clearAll() {
    this.descriptors.clear();
    this.mini.removeAll();    // MiniSearch v4+ supports clear()
  }

  /**
   * Internal: extract the fields we care about and feed MiniSearch.
   */
  private indexDescriptor<T>(desc: ResourceDescriptor<T>) {
    const base = {
      id:           desc.id,
      name:         desc.name,
      type:         desc.type,
      source:       desc.source,
      path:         desc.path,
      lastAccessed: desc.lastAccessed ?? 0,
      __all__: '__all__'
    };

    // enrich with REST-specific fields
    if (isRestDescriptor(desc)) {
      const d = desc.data as RestData;
      const dataTypes: string[] = [d.requestBody, d.response, ...d.variables?.map(a => a.ref.split('/').pop()) ?? []]
        .filter(a => !!a)
        .map(a => a as string);
      Object.assign(base, {
        method:      d.method,
        package:     d.paths?.join('/'),
        operationId: d.operationId,
        summary:     d.summary,
        description: d.description,
        dataTypes
      });
    }

    // enrich with Schema-specific fields
    if (isSchemaDescriptor(desc)) {
      const s = desc.data as Schema;
      // note: override base.name if you want
      Object.assign(base, { name: s.name });
    }

    // remove old index (if present) then add
    if (this.mini.has(base)) {
      this.mini.remove(base);
    }

    this.mini.add(base);
  }

  /**
   * Call this whenever a user “uses” (opens/invokes) a descriptor.
   * Updates lastAccessed and re-indexes.
   */
  touchDescriptor(id: string) {
    const desc = this.descriptors.get(id);
    if (!desc) return;
    desc.lastAccessed = Date.now();
    this.indexDescriptor(desc);
  }

  /**
   * Get the total count of search results without applying pagination
   * @param query Search query
   * @param opts Search options (excluding pagination)
   * @returns Total count of matching results
   */
  getTotalCount(query: string, opts: Omit<SearchOptions, 'limit' | 'offset'> = {}): number {
    const fuzzy = opts.fuzzy ?? 0.2;
    const q = query.trim().length ? query.trim() : '__all__';
    const rawHits = this.mini.search(q, { prefix: true, fuzzy,
      filter(doc) {
        return (!opts.type || doc.type === opts.type) &&
          (!opts.pkg || doc.package === opts.pkg) &&
          (!opts.source || doc.source === opts.source) &&
          (!opts.dataTypes || _.intersection(opts.dataTypes, doc.dataTypes)?.length > 0) &&
          (!opts.names || opts.names.includes(doc.name));
      }
    });
    
    return rawHits.length;
  }

  /**
   * Search by free-text; returns up to `limit` descriptors
   * sorted by α·relevance + (1-α)·recencyBoost.
   */
  search(query: string, opts: SearchOptions = {}): ResourceDescriptor<any>[] {
    const now     = Date.now();
    const fuzzy   = opts.fuzzy ?? 0.2;
    const q = query.trim().length ? query.trim() : '__all__';
    const rawHits = this.mini.search(q, { prefix: true, fuzzy,
      filter(doc) {
        return (!opts.type || doc.type === opts.type) &&
          (!opts.pkg || doc.package === opts.pkg) &&
          (!opts.source || doc.source === opts.source) &&
          (!opts.dataTypes || _.intersection(opts.dataTypes, doc.dataTypes)?.length > 0) &&
          (!opts.names || opts.names.includes(doc.name));
      }
    });

    // normalize the text-match scores to [0,1]
    const maxScore  = Math.max(...rawHits.map((h: any) => h.score), 1);

    const scored = rawHits.map((hit: { id: string; score: number }) => {
      const desc   = this.descriptors.get(hit.id)!;
      const rel    = hit.score / maxScore;
      const hours  = (now - (desc.lastAccessed ?? 0)) / (1000 * 60 * 60);
      const decay  = 1 / (1 + hours / this.halfLifeHours);
      const combined = this.alpha * rel + (1 - this.alpha) * decay;
      return { desc, combined };
    });

    const sorted = scored
      .sort((a: { combined: number }, b: { combined: number }) => b.combined - a.combined);
    
    // Apply offset and limit for pagination
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;
    
    return sorted
      .slice(offset, offset + limit)
      .map((x: { desc: ResourceDescriptor<any> }) => x.desc);
  }

  /**
   * Return the N most-recently used descriptors.
   */
  getRecent(limit = 20) {
    return Array.from(this.descriptors.values())
      .filter(d => d.lastAccessed != null)
      .sort((a, b) => b.lastAccessed! - a.lastAccessed!)
      .slice(0, limit);
  }

  /**
   * Get simple stats for a given source (or _all_ sources if none specified):
   *  - counts per `type`
   *  - list of unique `package` values (and its count)
   *  - count of unique paths in endpoints (controllers)
   */
  getStatsBySource() {
    // 1) grab all descriptors (or only those matching the given source)
    const all = Array.from(this.descriptors.values());

    // 2) count how many of each type
    const countsByType = all.reduce<Record<string, number>>((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {});

    // 3) collect unique packages (only REST descriptors have .data.paths)
    const sources = new Set<string>();
    all.forEach(d => {
      if (isRestDescriptor(d)) {
        sources.add(d.source)
      }
    });

    // 4) count unique paths in endpoints (controllers)
    const paths = new Set<string>();
    all.forEach(d => {
      if (isRestDescriptor(d) && d.path) {
        paths.add(d.path);
      }
    });
    const controllerCount = paths.size;

    return SourceStats.from({
      total: all.length,
      countsByType,                   // e.g. { endpoint: 42, model: 17, ... }
      uniqueSources: Array.from(sources),
      uniqueSourcesCount: sources.size,
      controllerCount,
    });
  }

  /**
   * Get data stats including source count, endpoint count, data type count, controller count,
   * used endpoint count, and used data type count.
   * Optionally filter by source.
   * @param source Optional source to filter by
   * @param forceReindex Whether to force reindexing before calculating stats
   */
  getDataStats(source?: string, forceReindex = false) {
    // Get all descriptors or filter by source if provided
    const all = Array.from(this.descriptors.values())
      .filter(d => !source || d.source === source);

    // Count unique sources
    const sources = new Set<string>();
    all.forEach(d => {
      if (d.source) {
        sources.add(d.source);
      }
    });

    // Count endpoints (REST descriptors)
    const endpointCount = all.filter(d => isRestDescriptor(d)).length;

    // Count data types (Schema descriptors)
    const dataTypeCount = all.filter(d => isSchemaDescriptor(d)).length;

    // Count unique paths in endpoints (controllers)
    const paths = new Set<string>();
    all.forEach(d => {
      if (isRestDescriptor(d) && d.data.paths && d.data.paths.length > 0) {
        d.data.paths.forEach(p => paths.add(p));
      }
    });
    const controllerCount = paths.size;
    
    // Get usage counts from the cached analysis
    const usedEndpointCount = this.codeAnalyzer.getUsageCounts(source, 'endpoint');
    const usedDataTypeCount = this.codeAnalyzer.getUsageCounts(source, 'datatype');
    const usedSourceCount = this.codeAnalyzer.getUsageCounts(source, 'source');
    const usedControllerCount = this.codeAnalyzer.getUsageCounts(source, 'controller');

    return DataStats.from({
      sourceCount: sources.size,
      endpointCount,
      dataTypeCount,
      controllerCount,
      usedEndpointCount,
      usedDataTypeCount,
      usedSourceCount,
      usedControllerCount,
    });
  }
}
