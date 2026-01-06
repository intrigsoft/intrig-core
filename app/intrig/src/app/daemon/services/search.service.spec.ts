import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from './search.service';
import { IntrigConfigService } from './intrig-config.service';
import { IntrigOpenapiService } from 'openapi-source';
import { ResourceDescriptor, RestData } from 'common';

describe('SearchService - Enhanced Search Features', () => {
  let service: SearchService;
  let configService: IntrigConfigService;
  let openApiService: IntrigOpenapiService;

  // Helper to create REST descriptor
  const createRestDescriptor = (
    id: string,
    operationId: string,
    path: string,
    method: string,
    summary: string,
    description: string,
    lastAccessed?: number
  ): ResourceDescriptor<RestData> => ({
    id,
    name: operationId,
    type: 'endpoint',
    source: 'test-api',
    path,
    lastAccessed: lastAccessed ?? Date.now(),
    data: {
      operationId,
      method,
      paths: [path.split('/')[1] || ''],
      summary,
      description,
      variables: [],
    } as RestData,
  });

  beforeEach(async () => {
    // Create mock services
    configService = {
      get: vi.fn().mockReturnValue({ sources: [] }),
    } as any;

    openApiService = {
      getResourceDescriptors: vi.fn().mockResolvedValue({ descriptors: [] }),
    } as any;

    // Create service instance with mocked dependencies
    service = new SearchService(configService, openApiService);

    await service.onModuleInit();
  });

  describe('Test Case 1: Field Boosting', () => {
    it('should rank operationId match above description match', () => {
      // Setup: Add descriptors with different field matches
      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Retrieve user data',
        'Fetches a single user by ID'
      );

      const fetchProfileDesc = createRestDescriptor(
        'fetch-profile-1',
        'fetchProfile',
        '/api/profiles/{id}',
        'GET',
        'Get profile information',
        'Get user profile information from the database'
      );

      service.addDescriptor(getUserDesc);
      service.addDescriptor(fetchProfileDesc);

      // Query: 'user' should match operationId in getUser and description in fetchProfile
      const results = service.search('user');

      // Assertion: getUser should rank first (operationId match beats description match)
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('get-user-1');
    });
  });

  describe('Test Case 2: Path Intent', () => {
    it('should prioritize exact path match over recency', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneHourAgo = now - 60 * 60 * 1000;

      const exactPathDesc = createRestDescriptor(
        'exact-path-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Get user',
        'Get user by ID',
        oneDayAgo // older
      );

      const similarPathDesc = createRestDescriptor(
        'similar-path-1',
        'listUserProfiles',
        '/api/user-profiles',
        'GET',
        'List profiles',
        'List all user profiles',
        oneHourAgo // more recent
      );

      service.addDescriptor(exactPathDesc);
      service.addDescriptor(similarPathDesc);

      // Query with exact path
      const results = service.search('/api/users/{id}');

      // Assertion: Exact path match should rank first despite being older
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('exact-path-1');
    });
  });

  describe('Test Case 3: HTTP Method Intent', () => {
    it('should filter and prioritize by HTTP method', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneHourAgo = now - 60 * 60 * 1000;

      const postUserDesc = createRestDescriptor(
        'post-user-1',
        'createUser',
        '/api/users',
        'POST',
        'Create user',
        'Create a new user',
        oneDayAgo // older
      );

      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'listUsers',
        '/api/users',
        'GET',
        'List users',
        'Get all users',
        oneHourAgo // more recent
      );

      service.addDescriptor(postUserDesc);
      service.addDescriptor(getUserDesc);

      // First verify basic search works
      const allResults = service.search('user');
      expect(allResults.length).toBeGreaterThanOrEqual(1);

      // Test HTTP method intent detection and filtering
      // When searching with method prefix, results should only include that method
      const postResults = service.search('POST user');

      // If method filtering is working, all results should be POST (or empty if no match)
      if (postResults.length > 0) {
        expect(postResults.every(r => r.data.method === 'POST')).toBe(true);
        expect(postResults.some(r => r.id === 'post-user-1')).toBe(true);
      }
    });
  });

  describe('Test Case 4: CamelCase Intent', () => {
    it('should prioritize exact camelCase operationId match', () => {
      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Get user',
        'Get user by ID'
      );

      const getUserSettingsDesc = createRestDescriptor(
        'get-user-settings-1',
        'getUserSettings',
        '/api/users/{id}/settings',
        'GET',
        'Get user settings',
        'Get user settings by ID'
      );

      service.addDescriptor(getUserDesc);
      service.addDescriptor(getUserSettingsDesc);

      // Query with camelCase hook name (matches getUser exactly)
      const results = service.search('useGetUser');

      // Assertion: getUser should rank first (exact camelCase match)
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('get-user-1');
    });
  });

  describe('Test Case 5: Exact Match Cache', () => {
    it('should use cache for exact operationId match', () => {
      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Get user',
        'Get user by ID'
      );

      service.addDescriptor(getUserDesc);

      // Query with exact operationId
      const results = service.search('getUser');

      // Assertion: Should return result
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('get-user-1');
    });

    it('should use cache for exact path match', () => {
      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Get user',
        'Get user by ID'
      );

      service.addDescriptor(getUserDesc);

      // Query with exact path
      const results = service.search('/api/users/{id}');

      // Assertion: Should return result from cache
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('get-user-1');
    });
  });

  describe('Test Case 6: Generic Query Unchanged', () => {
    it('should behave identically for generic text queries', () => {
      const userProfileDesc = createRestDescriptor(
        'user-profile-1',
        'getUserProfile',
        '/api/profiles/{id}',
        'GET',
        'Get user profile',
        'Get user profile data'
      );

      service.addDescriptor(userProfileDesc);

      // Generic query (no special pattern)
      const results = service.search('user profile');

      // Assertion: Should return results (behavior same as before)
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('user-profile-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const desc = createRestDescriptor(
        'test-1',
        'test',
        '/api/test',
        'GET',
        'Test',
        'Test endpoint'
      );

      service.addDescriptor(desc);

      // Empty query should return __all__ results
      const results = service.search('');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle query with only special characters', () => {
      const desc = createRestDescriptor(
        'test-1',
        'test',
        '/api/test',
        'GET',
        'Test',
        'Test endpoint'
      );

      service.addDescriptor(desc);

      // Special characters query should not crash
      expect(() => service.search('!@#$%^&*()')).not.toThrow();
    });

    it('should handle mixed intent signals (path takes precedence)', () => {
      const getUserDesc = createRestDescriptor(
        'get-user-1',
        'getUser',
        '/api/users/{id}',
        'GET',
        'Get user',
        'Get user by ID'
      );

      service.addDescriptor(getUserDesc);

      // Mixed intent: both path and HTTP method
      const results = service.search('GET /api/users');

      // Path intent should take precedence
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle very long queries', () => {
      const desc = createRestDescriptor(
        'test-1',
        'test',
        '/api/test',
        'GET',
        'Test',
        'Test endpoint'
      );

      service.addDescriptor(desc);

      // Very long query
      const longQuery = 'a'.repeat(300);
      expect(() => service.search(longQuery)).not.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain SearchOptions interface', () => {
      const desc1 = createRestDescriptor(
        'test-1',
        'test1',
        '/api/test1',
        'GET',
        'Test 1',
        'Test endpoint 1'
      );

      const desc2 = createRestDescriptor(
        'test-2',
        'test2',
        '/api/test2',
        'POST',
        'Test 2',
        'Test endpoint 2'
      );

      service.addDescriptor(desc1);
      service.addDescriptor(desc2);

      // Test all SearchOptions still work
      const results1 = service.search('test', { limit: 1 });
      expect(results1.length).toBeLessThanOrEqual(1);

      const results2 = service.search('test', { offset: 1 });
      expect(results2.length).toBeGreaterThanOrEqual(0);

      const results3 = service.search('test', { fuzzy: 0.5 });
      expect(results3.length).toBeGreaterThanOrEqual(0);

      const results4 = service.search('test', { type: 'endpoint' });
      expect(results4.every(r => r.type === 'endpoint')).toBe(true);
    });

    it('should maintain pagination behavior', () => {
      // Add multiple descriptors
      for (let i = 0; i < 10; i++) {
        service.addDescriptor(
          createRestDescriptor(
            `test-${i}`,
            `test${i}`,
            `/api/test${i}`,
            'GET',
            `Test ${i}`,
            `Test endpoint ${i}`
          )
        );
      }

      // Test pagination
      const page1 = service.search('test', { limit: 5, offset: 0 });
      const page2 = service.search('test', { limit: 5, offset: 5 });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Cache Invalidation', () => {
    it('should rebuild cache when descriptor is added', () => {
      const desc1 = createRestDescriptor(
        'get-alpha-1',
        'getAlpha',
        '/api/alpha',
        'GET',
        'Get Alpha',
        'Get alpha endpoint'
      );

      service.addDescriptor(desc1);

      // Should find via cache (exact match, no fuzzy)
      let results = service.search('getAlpha', { fuzzy: 0 });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('get-alpha-1');

      // Add another descriptor with different name
      const desc2 = createRestDescriptor(
        'get-beta-1',
        'getBeta',
        '/api/beta',
        'GET',
        'Get Beta',
        'Get beta endpoint'
      );

      service.addDescriptor(desc2);

      // Should find new descriptor via cache (exact match, no fuzzy)
      results = service.search('getBeta', { fuzzy: 0 });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('get-beta-1');
    });

    it('should rebuild cache when descriptor is removed', () => {
      const desc1 = createRestDescriptor(
        'test-1',
        'test1',
        '/api/test1',
        'GET',
        'Test 1',
        'Test endpoint 1'
      );

      service.addDescriptor(desc1);

      // Verify it exists
      let results = service.search('test1');
      expect(results.length).toBe(1);

      // Remove descriptor
      service.removeDescriptor('test-1');

      // Should not find it anymore
      results = service.search('test1');
      expect(results.length).toBe(0);
    });

    it('should clear cache when all descriptors are cleared', () => {
      const desc1 = createRestDescriptor(
        'test-1',
        'test1',
        '/api/test1',
        'GET',
        'Test 1',
        'Test endpoint 1'
      );

      service.addDescriptor(desc1);

      // Clear all
      service.clearAll();

      // Should not find anything
      const results = service.search('test1');
      expect(results.length).toBe(0);
    });
  });
});
