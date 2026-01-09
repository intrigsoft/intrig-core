/**
 * Daemon API type definitions.
 * Based on the OpenAPI spec at .intrig/specs/daemon_api-latest.json
 */

import { Result } from './discovery.js';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes specific to daemon client operations.
 */
export type DaemonClientErrorCode =
  | 'DAEMON_UNAVAILABLE'
  | 'RESOURCE_NOT_FOUND'
  | 'REQUEST_TIMEOUT'
  | 'INVALID_RESPONSE';

/**
 * Error type for daemon client operations.
 */
export interface DaemonClientError {
  code: DaemonClientErrorCode;
  message: string;
  statusCode?: number;
  cause?: unknown;
}

/**
 * Create a daemon client error.
 */
export function daemonClientError(
  code: DaemonClientErrorCode,
  message: string,
  statusCode?: number,
  cause?: unknown
): DaemonClientError {
  return { code, message, statusCode, cause };
}

/**
 * Result type for daemon client operations.
 */
export type DaemonResult<T> = Result<T, DaemonClientError>;

// ============================================================================
// Common Types
// ============================================================================

/**
 * Tab containing documentation content.
 */
export interface Tab {
  name: string;
  content: string;
}

/**
 * Reference to a related type.
 */
export interface RelatedType {
  name: string;
  id: string;
}

/**
 * Reference to a related endpoint.
 */
export interface RelatedEndpoint {
  id: string;
  name: string;
  method: string;
  path: string;
}

/**
 * Variable in an endpoint request.
 */
export interface Variable {
  name: string;
  in: string;
  ref?: string;
  relatedType?: RelatedType;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Resource type filter for search.
 */
export type ResourceType = 'rest' | 'schema';

/**
 * Search query parameters.
 */
export interface SearchParams {
  query?: string;
  type?: ResourceType;
  source?: string;
  page?: number;
  size?: number;
}

/**
 * A resource descriptor returned from search.
 */
export interface ResourceDescriptor {
  id: string;
  name: string;
  type: ResourceType;
  source: string;
  path?: string;
  description?: string;
  method?: string;
  data?: Record<string, unknown>;
  lastAccessed?: number;
}

/**
 * Pagination information.
 */
export interface PageInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Search response with paginated results.
 */
export interface SearchResponse extends PageInfo {
  data: ResourceDescriptor[];
}

// ============================================================================
// Documentation Types
// ============================================================================

/**
 * REST endpoint documentation.
 */
export interface RestDocumentation {
  id: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  requestBody?: RelatedType;
  contentType?: string;
  response?: RelatedType;
  responseType?: string;
  requestUrl: string;
  variables: Variable[];
  responseExamples?: Record<string, unknown>;
  tabs: Tab[];
}

/**
 * Schema documentation.
 */
export interface SchemaDocumentation {
  id: string;
  name: string;
  description?: string;
  jsonSchema: Record<string, unknown>;
  tabs: Tab[];
  relatedTypes: RelatedType[];
  relatedEndpoints: RelatedEndpoint[];
}

// ============================================================================
// Sources Types
// ============================================================================

/**
 * API source configuration.
 */
export interface IntrigSourceConfig {
  id: string;
  name: string;
  specUrl: string;
}

/**
 * Simplified source info for MCP responses.
 */
export interface SourceInfo {
  id: string;
  name: string;
  specUrl: string;
}
