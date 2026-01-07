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
 * HTTP methods recognized for method-only search
 */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

/**
 * Custom tokenizer that splits on whitespace, punctuation, and camelCase boundaries.
 * This enables "Request" to match "CreateUserRequest" and "User" to match "getUserProfile".
 *
 * Includes both original tokens and split tokens to preserve exact match ranking.
 * For example, "getUser" produces: ["getuser", "get", "user"]
 */
function camelCaseTokenizer(text: string): string[] {
  if (!text) return [];

  const tokens: string[] = [];

  // First split on whitespace, hyphens, underscores, slashes, and braces
  const baseTokens = text.split(/[\s\-_/{}]+/).filter(t => t.length > 0);

  for (const token of baseTokens) {
    const lower = token.toLowerCase();

    // Always include the full token for exact matching
    tokens.push(lower);

    // Split on camelCase boundaries
    const parts = token.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);

    // If it was split, add the individual parts too
    if (parts.length > 1) {
      for (const part of parts) {
        if (part.length > 0) {
          tokens.push(part.toLowerCase());
        }
      }
    }
  }

  return tokens;
}

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
        'dataTypes',
      ],
      idField: 'id',
      // Custom tokenizer for camelCase splitting
      tokenize: camelCaseTokenizer,
      // Field-specific boost weights applied during search
      boost: {
        operationId: FIELD_BOOSTS.operationId,
        name: FIELD_BOOSTS.name,
        path: FIELD_BOOSTS.path,
        method: FIELD_BOOSTS.method,
        summary: FIELD_BOOSTS.summary,
        description: FIELD_BOOSTS.description,
      },
      // Apply same tokenizer to search queries
      searchOptions: {
        tokenize: camelCaseTokenizer,
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
    // 1) Remove from the in-memory map
    this.descriptors.delete(id);

    // 2) Remove from MiniSearch by ID using discard()
    if (this.mini.has(id)) {
      this.mini.discard(id);
    }

    // 3) Rebuild cache to reflect removal
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
    const base: Record<string, any> = {
      id:           desc.id,
      name:         desc.name,
      type:         desc.type,
      source:       desc.source,
      path:         desc.path,
      lastAccessed: desc.lastAccessed ?? 0,
      // Ensure these are never undefined (MiniSearch may skip undefined fields)
      summary:      '',
      description:  '',
    };

    // enrich with REST-specific fields
    if (isRestDescriptor(desc)) {
      const d = desc.data as RestData;
      const dataTypes: string[] = [d.requestBody, d.response, ...d.variables?.map(a => a.ref.split('/').pop()) ?? []]
        .filter(a => !!a)
        .map(a => a as string);
      Object.assign(base, {
        method:      d.method ?? '',
        package:     d.paths?.join('/') ?? '',
        operationId: d.operationId ?? '',
        summary:     d.summary ?? '',
        description: d.description ?? '',
        dataTypes
      });
    }

    // enrich with Schema-specific fields
    if (isSchemaDescriptor(desc)) {
      const s = desc.data as Schema;
      Object.assign(base, { name: s.name });
    }

    // Remove old index entry by ID if present, then add new
    // Use discard() for removal by ID (not remove() which requires full document)
    if (this.mini.has(desc.id)) {
      this.mini.discard(desc.id);
    }

    this.mini.add(base);
  }

  /**
   * Call this whenever a user "uses" (opens/invokes) a descriptor.
   * Updates lastAccessed and re-indexes.
   */
  touchDescriptor(id: string) {
    const desc = this.descriptors.get(id);
    if (!desc) return;
    desc.lastAccessed = Date.now();
    this.indexDescriptor(desc);
  }

  /**
   * List all descriptors with optional filtering, sorting by recency, and pagination.
   * Used for empty queries and HTTP method-only queries (bypasses MiniSearch).
   */
  private listAllWithFilters(opts: SearchOptions & { method?: string } = {}): ResourceDescriptor<any>[] {
    const now = Date.now();
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 20;

    // Get all descriptors and apply filters
    let filtered = Array.from(this.descriptors.values()).filter(desc => {
      const restData = isRestDescriptor(desc) ? desc.data as RestData : null;

      // Type filter
      if (opts.type && desc.type !== opts.type) return false;

      // Package filter
      if (opts.pkg && restData?.paths?.join('/') !== opts.pkg) return false;

      // Source filter
      if (opts.source && desc.source !== opts.source) return false;

      // DataTypes filter
      if (opts.dataTypes && opts.dataTypes.length > 0) {
        if (!restData) return false;
        const descriptorDataTypes = [
          restData.requestBody,
          restData.response,
          ...(restData.variables?.map(v => v.ref.split('/').pop()) ?? [])
        ].filter(Boolean);
        if (_.intersection(opts.dataTypes, descriptorDataTypes).length === 0) return false;
      }

      // Names filter
      if (opts.names && !opts.names.includes(desc.name)) return false;

      // HTTP method filter (for method-only queries)
      if (opts.method && restData?.method !== opts.method) return false;

      return true;
    });

    // Sort by recency (most recent first)
    filtered.sort((a, b) => {
      const aTime = a.lastAccessed ?? 0;
      const bTime = b.lastAccessed ?? 0;
      return bTime - aTime;
    });

    // Apply pagination
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Count all descriptors matching filters (for getTotalCount with empty/method queries).
   */
  private countAllWithFilters(opts: Omit<SearchOptions, 'limit' | 'offset'> & { method?: string } = {}): number {
    return Array.from(this.descriptors.values()).filter(desc => {
      const restData = isRestDescriptor(desc) ? desc.data as RestData : null;

      if (opts.type && desc.type !== opts.type) return false;
      if (opts.pkg && restData?.paths?.join('/') !== opts.pkg) return false;
      if (opts.source && desc.source !== opts.source) return false;
      if (opts.dataTypes && opts.dataTypes.length > 0) {
        if (!restData) return false;
        const descriptorDataTypes = [
          restData.requestBody,
          restData.response,
          ...(restData.variables?.map(v => v.ref.split('/').pop()) ?? [])
        ].filter(Boolean);
        if (_.intersection(opts.dataTypes, descriptorDataTypes).length === 0) return false;
      }
      if (opts.names && !opts.names.includes(desc.name)) return false;
      if (opts.method && restData?.method !== opts.method) return false;

      return true;
    }).length;
  }

  /**
   * Get the total count of search results without applying pagination
   * @param query Search query
   * @param opts Search options (excluding pagination)
   * @returns Total count of matching results
   */
  getTotalCount(query: string, opts: Omit<SearchOptions, 'limit' | 'offset'> = {}): number {
    const trimmed = query.trim();
    const fuzzy = opts.fuzzy ?? 0.2;

    // Handle empty query - bypass MiniSearch entirely
    if (!trimmed) {
      return this.countAllWithFilters(opts);
    }

    // Handle HTTP method-only query (e.g., "GET", "POST")
    const upperQuery = trimmed.toUpperCase();
    if (HTTP_METHODS.includes(upperQuery as typeof HTTP_METHODS[number])) {
      return this.countAllWithFilters({ ...opts, method: upperQuery });
    }

    // Standard MiniSearch query
    const rawHits = this.mini.search(trimmed, {
      prefix: true,
      fuzzy,
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
    const trimmed = query.trim();

    // Handle empty query - bypass MiniSearch entirely
    if (!trimmed) {
      return this.listAllWithFilters(opts);
    }

    // Handle HTTP method-only query (e.g., "GET", "POST")
    const upperQuery = trimmed.toUpperCase();
    if (HTTP_METHODS.includes(upperQuery as typeof HTTP_METHODS[number])) {
      return this.listAllWithFilters({ ...opts, method: upperQuery });
    }

    // Detect query intent to determine scoring strategy
    const intent = detectIntent(trimmed);

    // Prepare search query based on intent
    let searchQuery = trimmed;
    if (intent.type === 'http_method') {
      // Strip HTTP method prefix from query (with optional whitespace)
      searchQuery = trimmed.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*/i, '').trim();
      if (!searchQuery) {
        // Only method was provided - use listAllWithFilters with method filter
        return this.listAllWithFilters({ ...opts, method: intent.method });
      }
    } else if (intent.type === 'camelcase') {
      // Strip common React hook prefix "use" if present
      // e.g., "useGetUser" -> "getUser"
      searchQuery = trimmed.replace(/^use([A-Z])/, '$1');
    }

    // Try exact match cache first (only for non-empty queries)
    if (searchQuery.length > 0) {
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
