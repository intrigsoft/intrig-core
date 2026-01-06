/**
 * HTTP client for communicating with Intrig daemon REST API.
 * Handles search, documentation retrieval, and source listing operations.
 * Uses Node.js native http/https modules for compatibility with all Node versions.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import { ok, err } from '../types/discovery.js';
import {
  DaemonResult,
  DaemonClientError,
  daemonClientError,
  SearchParams,
  SearchResponse,
  RestDocumentation,
  SchemaDocumentation,
  IntrigSourceConfig,
  ResourceType,
} from '../types/daemon-api.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

interface RequestConfig {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

const defaultConfig: Required<RequestConfig> = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  retryCount: DEFAULT_RETRY_COUNT,
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
};

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a timeout error.
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
  }
  return false;
}

/**
 * Check if an error is a connection error.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('econnreset') ||
      msg.includes('network')
    );
  }
  return false;
}

/**
 * Create an appropriate error from a request failure.
 */
function createRequestError(error: unknown): DaemonClientError {
  if (isTimeoutError(error)) {
    return daemonClientError(
      'REQUEST_TIMEOUT',
      'Request timed out',
      undefined,
      error
    );
  }

  if (isConnectionError(error)) {
    return daemonClientError(
      'DAEMON_UNAVAILABLE',
      'Could not connect to daemon',
      undefined,
      error
    );
  }

  return daemonClientError(
    'DAEMON_UNAVAILABLE',
    error instanceof Error ? error.message : 'Unknown error',
    undefined,
    error
  );
}

/**
 * Create an error from an HTTP response.
 */
function createHttpError(
  statusCode: number,
  statusText: string
): DaemonClientError {
  if (statusCode === 404) {
    return daemonClientError(
      'RESOURCE_NOT_FOUND',
      `Resource not found: ${statusText}`,
      statusCode
    );
  }

  if (statusCode >= 500) {
    return daemonClientError(
      'DAEMON_UNAVAILABLE',
      `Server error: ${statusCode} ${statusText}`,
      statusCode
    );
  }

  return daemonClientError(
    'INVALID_RESPONSE',
    `HTTP ${statusCode}: ${statusText}`,
    statusCode
  );
}

/**
 * Response from HTTP request.
 */
interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  body: string;
}

/**
 * Make an HTTP GET request using Node.js native modules.
 */
function httpGet(urlString: string, timeoutMs: number): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      timeout: timeoutMs,
    };

    const req = httpModule.request(options, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? '',
          body,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Make a request with retry logic.
 */
async function requestWithRetry<T>(
  url: string,
  config: Required<RequestConfig>
): Promise<DaemonResult<T>> {
  let lastError: DaemonClientError | null = null;

  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    try {
      const response = await httpGet(url, config.timeoutMs);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        lastError = createHttpError(response.statusCode, response.statusMessage);

        // Don't retry on 4xx errors (client errors)
        if (response.statusCode >= 400 && response.statusCode < 500) {
          return err(lastError);
        }

        // Retry on 5xx errors
        if (attempt < config.retryCount) {
          await sleep(config.retryDelayMs);
          continue;
        }

        return err(lastError);
      }

      const data = JSON.parse(response.body) as T;
      return ok(data);
    } catch (error) {
      lastError = createRequestError(error);

      // Don't retry on timeout (already timed out once)
      if (isTimeoutError(error)) {
        return err(lastError);
      }

      // Retry on connection errors
      if (attempt < config.retryCount) {
        await sleep(config.retryDelayMs);
        continue;
      }

      return err(lastError);
    }
  }

  return err(
    lastError ??
      daemonClientError('DAEMON_UNAVAILABLE', 'Request failed after retries')
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search for resources (endpoints and schemas) in the daemon.
 *
 * @param baseUrl - Base URL of the daemon (e.g., "http://localhost:5050")
 * @param params - Search parameters
 * @param config - Optional request configuration
 */
export async function search(
  baseUrl: string,
  params: SearchParams,
  config?: RequestConfig
): Promise<DaemonResult<SearchResponse>> {
  const url = new URL('/api/data/search', baseUrl);

  if (params.query) {
    url.searchParams.set('query', params.query);
  }
  if (params.type) {
    url.searchParams.set('type', params.type);
  }
  if (params.source) {
    url.searchParams.set('source', params.source);
  }
  if (params.page !== undefined) {
    url.searchParams.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    url.searchParams.set('size', String(params.size));
  }

  return requestWithRetry<SearchResponse>(url.toString(), {
    ...defaultConfig,
    ...config,
  });
}

/**
 * Get endpoint documentation by ID.
 *
 * @param baseUrl - Base URL of the daemon
 * @param id - Endpoint ID
 * @param config - Optional request configuration
 */
export async function getEndpointDocumentation(
  baseUrl: string,
  id: string,
  config?: RequestConfig
): Promise<DaemonResult<RestDocumentation>> {
  const url = new URL(`/api/data/get/endpoint/${encodeURIComponent(id)}`, baseUrl);

  return requestWithRetry<RestDocumentation>(url.toString(), {
    ...defaultConfig,
    ...config,
  });
}

/**
 * Get schema documentation by ID.
 *
 * @param baseUrl - Base URL of the daemon
 * @param id - Schema ID
 * @param config - Optional request configuration
 */
export async function getSchemaDocumentation(
  baseUrl: string,
  id: string,
  config?: RequestConfig
): Promise<DaemonResult<SchemaDocumentation>> {
  const url = new URL(`/api/data/get/schema/${encodeURIComponent(id)}`, baseUrl);

  return requestWithRetry<SchemaDocumentation>(url.toString(), {
    ...defaultConfig,
    ...config,
  });
}

/**
 * List all configured API sources.
 *
 * @param baseUrl - Base URL of the daemon
 * @param config - Optional request configuration
 */
export async function listSources(
  baseUrl: string,
  config?: RequestConfig
): Promise<DaemonResult<IntrigSourceConfig[]>> {
  const url = new URL('/api/config/sources/list', baseUrl);

  return requestWithRetry<IntrigSourceConfig[]>(url.toString(), {
    ...defaultConfig,
    ...config,
  });
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Search with a simpler interface, converting "endpoint"/"schema" to "rest"/"schema".
 *
 * @param baseUrl - Base URL of the daemon
 * @param query - Search query
 * @param type - Optional type filter ("endpoint" or "schema")
 * @param source - Optional source filter
 * @param limit - Optional result limit (default: 15)
 */
export async function searchSimple(
  baseUrl: string,
  query: string,
  type?: 'endpoint' | 'schema',
  source?: string,
  limit?: number
): Promise<DaemonResult<SearchResponse>> {
  // Map "endpoint" to "rest" for daemon API
  const daemonType: ResourceType | undefined =
    type === 'endpoint' ? 'rest' : type;

  return search(baseUrl, {
    query,
    type: daemonType,
    source,
    size: limit ?? 15,
    page: 1, // Daemon API uses 1-based pagination
  });
}
