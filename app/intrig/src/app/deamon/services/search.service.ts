import {Injectable, OnModuleInit} from '@nestjs/common';
import MiniSearch from 'minisearch';
import {isRestDescriptor, isSchemaDescriptor, ResourceDescriptor, RestData, Schema} from 'common';
import {IntrigConfigService} from "./intrig-config.service";
import {IntrigOpenapiService} from "openapi-source";
import {SourceStats} from "../models/source-stats";
import _ from "lodash";

export interface SearchOptions {
  /** fuzzy tolerance: 0–1 */
  fuzzy?: number;
  /** maximum number of results */
  limit?: number;
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

  constructor(private configService: IntrigConfigService,
              private openApiService: IntrigOpenapiService,) {
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
        const descriptors = await this.openApiService.getResourceDescriptors(source.id);
        descriptors.forEach(descriptor => this.addDescriptor(descriptor));
      }
    } catch (e) { /* empty */ }
  }


  /**
   * Add a new descriptor to the index (or re-index an updated one).
   */
  addDescriptor<T>(desc: ResourceDescriptor<T>) {
    this.descriptors.set(desc.id, desc);
    this.indexDescriptor(desc);
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

    return scored
      .sort((a: { combined: number }, b: { combined: number }) => b.combined - a.combined)
      .slice(0, opts.limit ?? 20)
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

    return SourceStats.from({
      total: all.length,
      countsByType,                   // e.g. { endpoint: 42, model: 17, ... }
      uniqueSources: Array.from(sources),
      uniqueSourcesCount: sources.size,
    });
  }
}
