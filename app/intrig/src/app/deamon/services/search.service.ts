import {Injectable, OnModuleInit} from '@nestjs/common';
import MiniSearch from 'minisearch';
import {isRestDescriptor, isSchemaDescriptor, ResourceDescriptor, RestData, Schema} from 'common';
import {IntrigConfigService} from "./intrig-config.service";
import {IntrigOpenapiService} from "openapi-source";

export interface SearchOptions {
  /** fuzzy tolerance: 0–1 */
  fuzzy?: number;
  /** maximum number of results */
  limit?: number;
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
    paths?: string[];
    operationId?: string;
    summary?: string;
    description?: string;
    lastAccessed: number;
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
        'paths',
        'operationId',
        'summary',
        'description',
      ],
      storeFields: [
        'id',
        'name',
        'type',
        'source',
        'path',
        'lastAccessed',
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
    } catch (e) {
    }
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
    };

    // enrich with REST-specific fields
    if (isRestDescriptor(desc)) {
      const d = desc.data as RestData;
      Object.assign(base, {
        method:      d.method,
        paths:       d.paths,
        operationId: d.operationId,
        summary:     d.summary,
        description: d.description,
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
  search(query: string, opts: SearchOptions = {}) {
    const now     = Date.now();
    const fuzzy   = opts.fuzzy ?? 0.2;
    const rawHits = this.mini.search(query, { prefix: true, fuzzy });

    // normalize the text-match scores to [0,1]
    const maxScore  = Math.max(...rawHits.map((h: any) => h.score), 1);

    const scored = rawHits.map((hit: any) => {
      const desc   = this.descriptors.get(hit.id)!;
      const rel    = hit.score / maxScore;
      const hours  = (now - (desc.lastAccessed ?? 0)) / (1000 * 60 * 60);
      const decay  = 1 / (1 + hours / this.halfLifeHours);
      const combined = this.alpha * rel + (1 - this.alpha) * decay;
      return { desc, combined };
    });

    return scored
      .sort((a: any, b: any) => b.combined - a.combined)
      .slice(0, opts.limit ?? 20)
      .map((x: any) => x.desc);
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
}
