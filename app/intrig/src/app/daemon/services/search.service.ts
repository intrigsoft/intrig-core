import {Injectable, OnModuleInit} from '@nestjs/common';
import MiniSearch from 'minisearch';
import {isRestDescriptor, isSchemaDescriptor, ResourceDescriptor, RestData, Schema} from 'common';
import {IntrigConfigService} from "./intrig-config.service";
import {IntrigOpenapiService} from "openapi-source";
import {SourceStats} from "../models/source-stats";
import {DataStats} from "../models/data-stats";
import _ from "lodash";

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

/**
 * Query intent types with associated scoring parameters
 */
export type QueryIntent =
  | { type: 'path', alpha: number }
  | { type: 'http_method', alpha: number, method: string }
  | { type: 'camelcase', alpha: number }
  | { type: 'generic', alpha: number };

/**
 * Field boost configuration for MiniSearch
 * Higher values give more weight to matches in that field
 */
const FIELD_BOOSTS = {
  operationId: 5.0,
  name: 3.0,
  path: 2.5,
  method: 2.0,
  summary: 1.0,
  description: 0.5,
} as const;

/**
 * Detects query intent based on patterns in the search string
 * Priority order: Path Pattern → HTTP Method → CamelCase → Generic
 */
function detectIntent(query: string): QueryIntent {
  const trimmed = query.trim();

  // Handle empty query
  if (!trimmed) {
    return { type: 'generic', alpha: 0.75 };
  }

  // Path Pattern: starts with / OR contains / with path-like segments
  if (trimmed.startsWith('/') || /\/[a-zA-Z0-9{}_-]+/.test(trimmed)) {
    return { type: 'path', alpha: 0.95 };
  }

  // HTTP Method Prefix: starts with HTTP method (case-insensitive)
  const methodMatch = trimmed.match(/^(GET|POST|PUT|PATCH|DELETE)\b/i);
  if (methodMatch) {
    return { type: 'http_method', alpha: 0.85, method: methodMatch[1].toUpperCase() };
  }

  // CamelCase Hook Name: contains uppercase letters in camelCase pattern
  // Matches patterns like useGetUser, getUserAction, etc.
  if (/[a-z][A-Z]/.test(trimmed)) {
    return { type: 'camelcase', alpha: 0.80 };
  }

  // Generic text: default fallback
  return { type: 'generic', alpha: 0.75 };
}

/**
 * Normalizes a string for cache key lookup
 */
function normalizeCacheKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    // Normalize path parameter placeholders to {param} format
    .replace(/:(\w+)/g, '{$1}')
    .replace(/<(\w+)>/g, '{$1}')
    // Strip leading/trailing slashes for paths
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Exact match cache for common access patterns
 * Provides O(1) lookups for operationId and path queries
 */
class ExactMatchCache {
  private operationIdCache = new Map<string, ResourceDescriptor<any>[]>();
  private pathCache = new Map<string, ResourceDescriptor<any>[]>();

  /**
   * Rebuilds cache from descriptor map
   */
  rebuild(descriptors: Map<string, ResourceDescriptor<any>>) {
    this.operationIdCache.clear();
    this.pathCache.clear();

    for (const descriptor of descriptors.values()) {
      // Cache by operationId (REST endpoints only)
      if (isRestDescriptor(descriptor)) {
        const restData = descriptor.data as RestData;
        if (restData.operationId) {
          const key = normalizeCacheKey(restData.operationId);
          const existing = this.operationIdCache.get(key) || [];
          this.operationIdCache.set(key, [...existing, descriptor]);
        }
      }

      // Cache by path
      if (descriptor.path) {
        const key = normalizeCacheKey(descriptor.path);
        const existing = this.pathCache.get(key) || [];
        this.pathCache.set(key, [...existing, descriptor]);
      }
    }
  }

  /**
   * Attempts to find exact matches for the query
   * Returns null if no exact match found
   */
  lookup(query: string): ResourceDescriptor<any>[] | null {
    const normalized = normalizeCacheKey(query);

    // Try operationId cache first (most specific)
    const opIdMatch = this.operationIdCache.get(normalized);
    if (opIdMatch && opIdMatch.length > 0) {
      return opIdMatch;
    }

    // Try path cache
    const pathMatch = this.pathCache.get(normalized);
    if (pathMatch && pathMatch.length > 0) {
      return pathMatch;
    }

    return null;
  }

  /**
   * Clears all cache entries
   */
  clear() {
    this.operationIdCache.clear();
    this.pathCache.clear();
  }
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

  /** Exact match cache for fast O(1) lookups */
  private exactMatchCache = new ExactMatchCache();

  /** Default weight on text relevance vs. recency (can be overridden by intent detection) */
  private readonly defaultAlpha = 0.75;

  /** Half-life in hours for recency decay */
  private readonly halfLifeHours = 24;

  constructor(
    private configService: IntrigConfigService,
    private openApiService: IntrigOpenapiService
  ) {
    this.mini = new MiniSearch({
      fields: [
        'operationId',
        'name',
        'path',
        'method',
        'package',
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
        'method',
        'package',
        'operationId',
        'summary',
        'description',
        'lastAccessed',
        '__all__',
        'dataTypes',
      ],
      idField: 'id',
      // Field-specific boost weights applied during search
      boost: {
        operationId: FIELD_BOOSTS.operationId,
        name: FIELD_BOOSTS.name,
        path: FIELD_BOOSTS.path,
        method: FIELD_BOOSTS.method,
        summary: FIELD_BOOSTS.summary,
        description: FIELD_BOOSTS.description,
      },
    });
  }

  async onModuleInit() {
    try {
      const config = this.configService.get();
      const sources = config?.sources || [];

      for (const source of sources) {
        const {descriptors} = await this.openApiService.getResourceDescriptors(source.id);
        // Skip cache rebuild during bulk loading for performance
        descriptors.forEach(descriptor => this.addDescriptor(descriptor, true));
      }

      // Rebuild exact match cache once after all initial descriptors are loaded
      this.exactMatchCache.rebuild(this.descriptors);
    } catch (e: any) {

    }
  }


  /**
   * Add a new descriptor to the index (or re-index an updated one).
   * @param desc The descriptor to add
   * @param skipCacheRebuild Skip rebuilding the cache (useful for bulk operations)
   */
  addDescriptor<T>(desc: ResourceDescriptor<T>, skipCacheRebuild = false) {
    this.descriptors.set(desc.id, desc);
    this.indexDescriptor(desc);

    // Rebuild cache to include new descriptor (unless explicitly skipped)
    if (!skipCacheRebuild) {
      this.exactMatchCache.rebuild(this.descriptors);
    }
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
    // 1) Get descriptor before removing
    const desc = this.descriptors.get(id);

    // 2) Remove from the in-memory map
    this.descriptors.delete(id);

    // 3) Remove from MiniSearch
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

    // 4) Rebuild cache to reflect removal
    this.exactMatchCache.rebuild(this.descriptors);
  }

  /**
   * (Optional) Clear the entire index and map.
   */
  clearAll() {
    this.descriptors.clear();
    this.mini.removeAll();    // MiniSearch v4+ supports clear()
    this.exactMatchCache.clear();
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
   * Uses intent detection to adjust scoring and exact match cache for fast lookups.
   */
  search(query: string, opts: SearchOptions = {}): ResourceDescriptor<any>[] {
    const now = Date.now();
    const fuzzy = opts.fuzzy ?? 0.2;
    const q = query.trim().length ? query.trim() : '__all__';

    // Detect query intent to determine scoring strategy
    const intent = detectIntent(q);

    // Prepare search query based on intent
    let searchQuery = q;
    if (intent.type === 'http_method') {
      // Strip HTTP method prefix from query (with optional whitespace)
      searchQuery = q.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*/i, '').trim();
      if (!searchQuery) {
        searchQuery = '__all__'; // If only method was provided, search all
      }
    } else if (intent.type === 'camelcase') {
      // Strip common React hook prefix "use" if present
      // e.g., "useGetUser" -> "getUser"
      searchQuery = q.replace(/^use([A-Z])/, '$1');
    }

    // Try exact match cache first (only for non-empty, non-__all__ queries)
    if (searchQuery !== '__all__' && searchQuery.length > 0) {
      const cachedResults = this.exactMatchCache.lookup(searchQuery);
      if (cachedResults && cachedResults.length > 0) {
        // Apply filters to cached results
        let filtered = cachedResults.filter(desc => {
          const restData = isRestDescriptor(desc) ? desc.data as RestData : null;
          return (!opts.type || desc.type === opts.type) &&
            (!opts.pkg || (restData?.paths?.join('/') === opts.pkg)) &&
            (!opts.source || desc.source === opts.source) &&
            (!opts.dataTypes || (restData && _.intersection(opts.dataTypes, [
              restData.requestBody,
              restData.response,
              ...(restData.variables?.map(v => v.ref.split('/').pop()) ?? [])
            ].filter(Boolean)).length > 0)) &&
            (!opts.names || opts.names.includes(desc.name)) &&
            (intent.type !== 'http_method' || (restData?.method === intent.method));
        });

        // Apply pagination
        const offset = opts.offset ?? 0;
        const limit = opts.limit ?? 20;
        return filtered.slice(offset, offset + limit);
      }
    }

    // Build filter function with intent-specific logic
    const buildFilter = () => {
      if (intent.type === 'http_method') {
        // For HTTP method intent, filter by method
        return (doc: any) => {
          return (!opts.type || doc.type === opts.type) &&
            (!opts.pkg || doc.package === opts.pkg) &&
            (!opts.source || doc.source === opts.source) &&
            (!opts.dataTypes || _.intersection(opts.dataTypes, doc.dataTypes)?.length > 0) &&
            (!opts.names || opts.names.includes(doc.name)) &&
            (doc.method === intent.method);
        };
      }

      // Default filter for other intent types
      return (doc: any) => {
        return (!opts.type || doc.type === opts.type) &&
          (!opts.pkg || doc.package === opts.pkg) &&
          (!opts.source || doc.source === opts.source) &&
          (!opts.dataTypes || _.intersection(opts.dataTypes, doc.dataTypes)?.length > 0) &&
          (!opts.names || opts.names.includes(doc.name));
      };
    };

    // Perform MiniSearch query
    const rawHits = this.mini.search(searchQuery, {
      prefix: true,
      fuzzy,
      filter: buildFilter(),
    });

    // Normalize the text-match scores to [0,1]
    const maxScore = Math.max(...rawHits.map((h: any) => h.score), 1);

    // Apply intent-adjusted alpha for scoring
    const alpha = intent.alpha;

    const scored = rawHits
      .map((hit: { id: string; score: number }) => {
        const desc = this.descriptors.get(hit.id);
        // Skip if descriptor was deleted (safety check for stale MiniSearch results)
        if (!desc) return null;

        const rel = hit.score / maxScore;
        const hours = (now - (desc.lastAccessed ?? 0)) / (1000 * 60 * 60);
        const decay = 1 / (1 + hours / this.halfLifeHours);
        const combined = alpha * rel + (1 - alpha) * decay;
        return { desc, combined };
      })
      .filter((item): item is { desc: ResourceDescriptor<any>; combined: number } => item !== null);

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
