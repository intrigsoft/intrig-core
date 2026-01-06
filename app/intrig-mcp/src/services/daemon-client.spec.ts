import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  search,
  getEndpointDocumentation,
  getSchemaDocumentation,
  listSources,
  searchSimple,
} from './daemon-client.js';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('daemon-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseUrl = 'http://localhost:5050';

  // Helper to create a mock Response
  function createMockResponse(
    data: unknown,
    options: { ok?: boolean; status?: number; statusText?: string } = {}
  ): Response {
    const { ok = true, status = 200, statusText = 'OK' } = options;
    return {
      ok,
      status,
      statusText,
      json: () => Promise.resolve(data),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: () => createMockResponse(data, options),
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response;
  }

  describe('search', () => {
    it('should make search request with query parameters', async () => {
      const mockResponse = {
        data: [
          { id: '1', name: 'Test', type: 'rest', source: 'api' },
        ],
        total: 1,
        page: 0,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = search(baseUrl, {
        query: 'user',
        type: 'rest',
        source: 'petstore',
        page: 0,
        size: 10,
      });

      // Advance timers to allow fetch to complete
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(mockResponse);
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/data/search');
      expect(calledUrl).toContain('query=user');
      expect(calledUrl).toContain('type=rest');
      expect(calledUrl).toContain('source=petstore');
    });

    it('should handle empty query parameters', async () => {
      const mockResponse = { data: [], total: 0, page: 0, limit: 10, totalPages: 0, hasNext: false, hasPrevious: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = search(baseUrl, {});
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('http://localhost:5050/api/data/search');
    });

    it('should return error on 404 response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, { ok: false, status: 404, statusText: 'Not Found' })
      );

      const resultPromise = search(baseUrl, { query: 'test' });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
        expect(result.error.statusCode).toBe(404);
      }
    });

    it('should retry on 5xx errors', async () => {
      const serverError = createMockResponse(
        {},
        { ok: false, status: 500, statusText: 'Internal Server Error' }
      );
      const successResponse = createMockResponse({
        data: [],
        total: 0,
        page: 0,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });

      mockFetch
        .mockResolvedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = search(baseUrl, { query: 'test' }, { retryCount: 1, retryDelayMs: 100 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return error after max retries', async () => {
      const serverError = createMockResponse(
        {},
        { ok: false, status: 503, statusText: 'Service Unavailable' }
      );

      mockFetch.mockResolvedValue(serverError);

      const resultPromise = search(baseUrl, { query: 'test' }, { retryCount: 2, retryDelayMs: 50 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DAEMON_UNAVAILABLE');
      }
      // Initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed: ECONNREFUSED'));

      const resultPromise = search(baseUrl, { query: 'test' }, { retryCount: 0 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('DAEMON_UNAVAILABLE');
      }
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const resultPromise = search(baseUrl, { query: 'test' }, { retryCount: 0, timeoutMs: 100 });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('REQUEST_TIMEOUT');
      }
    });
  });

  describe('getEndpointDocumentation', () => {
    it('should fetch endpoint documentation', async () => {
      const mockDoc = {
        id: 'endpoint-1',
        name: 'getUser',
        method: 'GET',
        path: '/api/users/{id}',
        requestUrl: 'http://api.example.com/users/{id}',
        variables: [],
        responseExamples: {},
        tabs: [{ name: 'Overview', content: 'User endpoint' }],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockDoc));

      const resultPromise = getEndpointDocumentation(baseUrl, 'endpoint-1');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('endpoint-1');
        expect(result.value.name).toBe('getUser');
      }

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/data/get/endpoint/endpoint-1');
    });

    it('should encode special characters in ID', async () => {
      const mockDoc = {
        id: 'endpoint/special',
        name: 'test',
        method: 'GET',
        path: '/test',
        requestUrl: '',
        variables: [],
        responseExamples: {},
        tabs: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockDoc));

      const resultPromise = getEndpointDocumentation(baseUrl, 'endpoint/special');
      await vi.runAllTimersAsync();
      await resultPromise;

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('endpoint%2Fspecial');
    });

    it('should return error on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, { ok: false, status: 404, statusText: 'Not Found' })
      );

      const resultPromise = getEndpointDocumentation(baseUrl, 'nonexistent');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
      }
    });
  });

  describe('getSchemaDocumentation', () => {
    it('should fetch schema documentation', async () => {
      const mockDoc = {
        id: 'schema-1',
        name: 'User',
        description: 'User model',
        jsonSchema: { type: 'object' },
        tabs: [],
        relatedTypes: [],
        relatedEndpoints: [],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockDoc));

      const resultPromise = getSchemaDocumentation(baseUrl, 'schema-1');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('schema-1');
        expect(result.value.name).toBe('User');
      }

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/data/get/schema/schema-1');
    });
  });

  describe('listSources', () => {
    it('should fetch source list', async () => {
      const mockSources = [
        { id: 'petstore', name: 'Pet Store API', specUrl: 'http://example.com/petstore.json' },
        { id: 'users', name: 'Users API', specUrl: 'http://example.com/users.json' },
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(mockSources));

      const resultPromise = listSources(baseUrl);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].id).toBe('petstore');
      }

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/config/sources/list');
    });
  });

  describe('searchSimple', () => {
    it('should convert endpoint type to rest', async () => {
      const mockResponse = { data: [], total: 0, page: 0, limit: 15, totalPages: 0, hasNext: false, hasPrevious: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = searchSimple(baseUrl, 'test', 'endpoint');
      await vi.runAllTimersAsync();
      await resultPromise;

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('type=rest');
    });

    it('should pass schema type unchanged', async () => {
      const mockResponse = { data: [], total: 0, page: 0, limit: 15, totalPages: 0, hasNext: false, hasPrevious: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = searchSimple(baseUrl, 'test', 'schema');
      await vi.runAllTimersAsync();
      await resultPromise;

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('type=schema');
    });

    it('should use default limit of 15', async () => {
      const mockResponse = { data: [], total: 0, page: 0, limit: 15, totalPages: 0, hasNext: false, hasPrevious: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = searchSimple(baseUrl, 'test');
      await vi.runAllTimersAsync();
      await resultPromise;

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('size=15');
    });

    it('should allow custom limit', async () => {
      const mockResponse = { data: [], total: 0, page: 0, limit: 5, totalPages: 0, hasNext: false, hasPrevious: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const resultPromise = searchSimple(baseUrl, 'test', undefined, undefined, 5);
      await vi.runAllTimersAsync();
      await resultPromise;

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('size=5');
    });
  });
});
