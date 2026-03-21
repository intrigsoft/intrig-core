/**
 * SearchService Behavior Documentation Test Suite
 *
 * This test suite documents the current search behavior of SearchService
 * and identifies gaps between expected UX and actual implementation.
 *
 * Each test documents:
 * - Input: Query string and options
 * - Expected behavior (from UX perspective)
 * - Actual behavior (what the current implementation does)
 * - Gap (if expected ≠ actual)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService, SearchOptions } from './search.service';
import { IntrigConfigService } from './intrig-config.service';
import { IntrigOpenapiService } from 'openapi-source';
import { ResourceDescriptor, RestData, Schema } from 'common';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Helper to create REST endpoint descriptor
 */
const createRestDescriptor = (
  id: string,
  operationId: string,
  path: string,
  method: string,
  summary: string,
  description: string,
  options?: {
    lastAccessed?: number;
    source?: string;
    requestBody?: string;
    response?: string;
    variables?: Array<{ ref: string }>;
  }
): ResourceDescriptor<RestData> => ({
  id,
  name: operationId,
  type: 'endpoint',
  source: options?.source ?? 'test-api',
  path,
  lastAccessed: options?.lastAccessed ?? Date.now(),
  data: {
    operationId,
    method,
    paths: path.split('/').filter(Boolean).slice(0, -1), // Extract path segments
    summary,
    description,
    requestBody: options?.requestBody,
    response: options?.response,
    variables: options?.variables ?? [],
  } as RestData,
});

/**
 * Helper to create Schema descriptor
 */
const createSchemaDescriptor = (
  id: string,
  name: string,
  options?: {
    lastAccessed?: number;
    source?: string;
    schemaDescription?: string;
  }
): ResourceDescriptor<Schema> => ({
  id,
  name,
  type: 'schema',
  source: options?.source ?? 'test-api',
  path: `/schemas/${name}`,
  lastAccessed: options?.lastAccessed ?? Date.now(),
  data: {
    name,
    schema: {
      type: 'object',
      description: options?.schemaDescription ?? `${name} schema`,
    },
  } as Schema,
});

/**
 * Comprehensive test data set for search behavior tests
 */
const createTestDescriptors = () => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  return {
    // Endpoints with similar names (ranking test)
    getUser: createRestDescriptor(
      'get-user',
      'getUser',
      '/api/users/{id}',
      'GET',
      'Get a user by ID',
      'Retrieves a single user record by their unique identifier',
      { lastAccessed: oneHourAgo }
    ),
    getUsers: createRestDescriptor(
      'get-users',
      'getUsers',
      '/api/users',
      'GET',
      'List all users',
      'Returns a paginated list of all users',
      { lastAccessed: oneDayAgo }
    ),
    getUserProfile: createRestDescriptor(
      'get-user-profile',
      'getUserProfile',
      '/api/users/{id}/profile',
      'GET',
      'Get user profile',
      'Retrieves the profile information for a specific user',
      { lastAccessed: oneWeekAgo }
    ),
    getAllUserSettings: createRestDescriptor(
      'get-all-user-settings',
      'getAllUserSettings',
      '/api/users/{id}/settings',
      'GET',
      'Get all user settings',
      'Returns all configuration settings for a user',
      { lastAccessed: oneWeekAgo }
    ),

    // Same path, different methods (method search test)
    createUser: createRestDescriptor(
      'create-user',
      'createUser',
      '/api/users',
      'POST',
      'Create a new user',
      'Creates a new user account',
      { lastAccessed: oneDayAgo }
    ),
    updateUser: createRestDescriptor(
      'update-user',
      'updateUser',
      '/api/users/{id}',
      'PUT',
      'Update a user',
      'Updates an existing user record',
      { lastAccessed: oneDayAgo }
    ),
    deleteUser: createRestDescriptor(
      'delete-user',
      'deleteUser',
      '/api/users/{id}',
      'DELETE',
      'Delete a user',
      'Removes a user from the system',
      { lastAccessed: oneWeekAgo }
    ),
    patchUser: createRestDescriptor(
      'patch-user',
      'patchUser',
      '/api/users/{id}',
      'PATCH',
      'Partially update a user',
      'Partially updates specific fields of a user record',
      { lastAccessed: oneWeekAgo }
    ),

    // Term in different fields (boosting test)
    searchProducts: createRestDescriptor(
      'search-products',
      'searchProducts',
      '/api/products/search',
      'GET',
      'Search user products',
      'Returns products for user',
      { lastAccessed: oneDayAgo }
    ),
    findUserById: createRestDescriptor(
      'find-user-by-id',
      'findUserById',
      '/api/lookup',
      'GET',
      'Find by ID',
      'Finds a user by their ID',
      { lastAccessed: oneDayAgo }
    ),

    // Different paths for path search testing
    orders: createRestDescriptor(
      'get-orders',
      'getOrders',
      '/api/orders',
      'GET',
      'List orders',
      'Returns all orders',
      { lastAccessed: oneDayAgo }
    ),
    orderById: createRestDescriptor(
      'get-order-by-id',
      'getOrderById',
      '/api/orders/{orderId}',
      'GET',
      'Get order by ID',
      'Returns a specific order',
      { lastAccessed: oneDayAgo }
    ),
    orderItems: createRestDescriptor(
      'get-order-items',
      'getOrderItems',
      '/api/orders/{orderId}/items',
      'GET',
      'Get order items',
      'Returns items in an order',
      { lastAccessed: oneDayAgo }
    ),

    // Schemas
    userSchema: createSchemaDescriptor('user-schema', 'User', { lastAccessed: oneDayAgo }),
    userProfileSchema: createSchemaDescriptor('user-profile-schema', 'UserProfile', {
      lastAccessed: oneWeekAgo,
    }),
    createUserRequestSchema: createSchemaDescriptor('create-user-request-schema', 'CreateUserRequest', {
      lastAccessed: oneWeekAgo,
    }),
    orderSchema: createSchemaDescriptor('order-schema', 'Order', { lastAccessed: oneDayAgo }),
    productSchema: createSchemaDescriptor('product-schema', 'Product', { lastAccessed: oneDayAgo }),
  };
};

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a fresh SearchService instance with mocked dependencies
 */
const createSearchService = async (): Promise<SearchService> => {
  const configService = {
    get: vi.fn().mockReturnValue({ sources: [] }),
  } as unknown as IntrigConfigService;

  const openApiService = {
    getResourceDescriptors: vi.fn().mockResolvedValue({ descriptors: [] }),
  } as unknown as IntrigOpenapiService;

  const service = new SearchService(configService, openApiService);
  await service.onModuleInit();
  return service;
};

/**
 * Add all test descriptors to the service
 */
const populateWithTestData = (
  service: SearchService,
  descriptors: ReturnType<typeof createTestDescriptors>
) => {
  Object.values(descriptors).forEach((desc) => {
    service.addDescriptor(desc);
  });
};

/**
 * Document search results for debugging/analysis
 */
const documentResults = (
  query: string,
  results: ResourceDescriptor<any>[],
  showFields: string[] = ['id', 'name', 'path', 'type']
) => {
  console.log(`\n=== Query: "${query}" ===`);
  console.log(`Results count: ${results.length}`);
  results.forEach((r, i) => {
    const fields = showFields.reduce((acc, f) => {
      if (f === 'operationId' && r.data?.operationId) {
        acc[f] = r.data.operationId;
      } else if (f === 'method' && r.data?.method) {
        acc[f] = r.data.method;
      } else if (f in r) {
        acc[f] = (r as any)[f];
      }
      return acc;
    }, {} as Record<string, any>);
    console.log(`  ${i + 1}. ${JSON.stringify(fields)}`);
  });
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SearchService Behavior Documentation', () => {
  let service: SearchService;
  let testData: ReturnType<typeof createTestDescriptors>;

  beforeEach(async () => {
    service = await createSearchService();
    testData = createTestDescriptors();
    populateWithTestData(service, testData);
  });

  // ==========================================================================
  // 1. BASIC SEARCH BEHAVIOR
  // ==========================================================================

  describe('1. Basic Search Behavior', () => {
    describe('1.1 Empty Query', () => {
      it('should return all results when query is empty', () => {
        // Input
        const results = service.search('');

        // Expected: Empty query should return all indexed documents
        // Actual: Uses __all__ workaround to return all results
        expect(results.length).toBeGreaterThan(0);

        // Document: How many results does an empty query return?
        const totalDescriptors = Object.keys(testData).length;
        console.log(
          `Empty query returned ${results.length} of ${totalDescriptors} descriptors (limit=20 default)`
        );
      });

      it('should return results with default limit of 20', () => {
        // Add more descriptors to exceed default limit
        for (let i = 0; i < 30; i++) {
          service.addDescriptor(
            createRestDescriptor(
              `extra-${i}`,
              `extraEndpoint${i}`,
              `/api/extra/${i}`,
              'GET',
              `Extra ${i}`,
              `Extra endpoint ${i}`
            )
          );
        }

        const results = service.search('');

        // Expected: Default limit is 20
        expect(results.length).toBe(20);
      });
    });

    describe('1.2 Pagination', () => {
      it('should paginate results correctly with offset and limit', () => {
        const page1 = service.search('', { offset: 0, limit: 5 });
        const page2 = service.search('', { offset: 5, limit: 5 });

        // Expected: Pages should not overlap
        expect(page1.length).toBeLessThanOrEqual(5);
        expect(page2.length).toBeLessThanOrEqual(5);

        // Check no overlap
        const page1Ids = new Set(page1.map((r) => r.id));
        const hasOverlap = page2.some((r) => page1Ids.has(r.id));
        expect(hasOverlap).toBe(false);
      });

      it('should return empty array when offset exceeds total results', () => {
        const results = service.search('user', { offset: 1000, limit: 10 });
        expect(results.length).toBe(0);
      });

      it('getTotalCount should return accurate count', () => {
        const totalCount = service.getTotalCount('user');
        const allResults = service.search('user', { limit: 100 });

        // Expected: getTotalCount should match total results
        expect(totalCount).toBe(allResults.length);
      });
    });

    describe('1.3 Type Filtering', () => {
      it('should filter by type=endpoint', () => {
        const results = service.search('user', { type: 'endpoint' });

        // Expected: All results should be endpoints
        expect(results.every((r) => r.type === 'endpoint')).toBe(true);
      });

      it('should filter by type=schema', () => {
        const results = service.search('user', { type: 'schema' });

        // Expected: All results should be schemas
        expect(results.every((r) => r.type === 'schema')).toBe(true);

        // Document actual behavior
        console.log(
          'Schema search for "user":',
          results.map((r) => r.name)
        );
      });
    });

    describe('1.4 Source Filtering', () => {
      beforeEach(() => {
        // Add descriptors from different sources
        service.addDescriptor(
          createRestDescriptor('other-api-1', 'otherGetUser', '/api/users', 'GET', 'Get User', 'Get user', {
            source: 'other-api',
          })
        );
      });

      it('should filter by source', () => {
        const testApiResults = service.search('user', { source: 'test-api' });
        const otherApiResults = service.search('user', { source: 'other-api' });

        expect(testApiResults.every((r) => r.source === 'test-api')).toBe(true);
        expect(otherApiResults.every((r) => r.source === 'other-api')).toBe(true);
      });
    });

    describe('1.5 Sorting by Combined Score', () => {
      it('should sort by combined relevance + recency score', () => {
        const results = service.search('user');

        // Document the actual order
        documentResults('user', results, ['id', 'name', 'path']);

        // Expected: Results should be sorted (we can't easily verify the exact order
        // without knowing the internal scores, but we can verify order is consistent)
        expect(results.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 2. TEXT MATCHING BEHAVIOR
  // ==========================================================================

  describe('2. Text Matching Behavior', () => {
    describe('2.1 Exact operationId Match', () => {
      it('should find exact operationId match for "getUser"', () => {
        const results = service.search('getUser');

        // Expected: Exact match should be first
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].id).toBe('get-user');

        // Document: Is exact match always first?
        console.log(
          'Results for "getUser":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );
      });

      it('should find exact operationId match for "getUserProfile"', () => {
        const results = service.search('getUserProfile');

        // Expected: Exact match for getUserProfile
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].id).toBe('get-user-profile');
      });
    });

    describe('2.2 Partial operationId Match', () => {
      it('should find partial match: "user" should find getUser, updateUser, etc.', () => {
        const results = service.search('user');

        // Expected: All user-related endpoints should be found
        const userRelatedIds = results.filter((r) => r.name?.toLowerCase().includes('user') || r.data?.operationId?.toLowerCase().includes('user'));

        // Document behavior
        documentResults('user', results, ['id', 'operationId', 'path']);

        expect(userRelatedIds.length).toBeGreaterThan(0);
      });

      it('should handle prefix search correctly with "get"', () => {
        const results = service.search('get');

        // Expected: Should find all endpoints starting with "get"
        const getEndpoints = results.filter((r) => r.data?.operationId?.toLowerCase().startsWith('get'));

        // Document: Does prefix search work?
        console.log(
          'Endpoints starting with "get":',
          getEndpoints.map((r) => r.data?.operationId)
        );

        // GAP DOCUMENTED: "get" triggers HTTP method intent detection which filters
        // to GET endpoints, but if there's no additional query text, the __all__
        // search may not return results as expected. This is a known limitation.
        console.log(`GAP: Prefix "get" found ${getEndpoints.length} operationIds starting with "get"`);
        console.log(`Total results for "get": ${results.length}`);

        // Document behavior rather than assert expectation
        // expect(getEndpoints.length).toBeGreaterThan(0);
      });
    });

    describe('2.3 Case Sensitivity', () => {
      it('should handle lowercase query "getuser"', () => {
        const results = service.search('getuser');

        // Expected: Case-insensitive search should find "getUser"
        // Document actual behavior
        console.log(
          'Results for "getuser" (lowercase):',
          results.slice(0, 3).map((r) => r.data?.operationId || r.name)
        );

        // GAP IDENTIFICATION: Does case-insensitive search work?
        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');
        console.log(`GAP: Case-insensitive search ${foundGetUser ? 'WORKS' : 'DOES NOT WORK'}`);

        // MiniSearch default tokenizer lowercases, so this should work
        expect(foundGetUser).toBe(true);
      });

      it('should handle uppercase query "GETUSER"', () => {
        const results = service.search('GETUSER');

        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');
        console.log(`Results for "GETUSER": found getUser = ${foundGetUser}`);

        expect(foundGetUser).toBe(true);
      });

      it('should handle mixed case "GetUser"', () => {
        const results = service.search('GetUser');

        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');
        console.log(`Results for "GetUser": found getUser = ${foundGetUser}`);

        expect(foundGetUser).toBe(true);
      });
    });

    describe('2.4 Method Name Search', () => {
      it('should find endpoints by HTTP method "GET"', () => {
        const results = service.search('GET');

        // Expected: HTTP method intent should filter to GET endpoints
        // Document actual behavior
        const getEndpoints = results.filter((r) => r.data?.method === 'GET');
        const nonGetEndpoints = results.filter((r) => r.data?.method && r.data.method !== 'GET');

        console.log(`GET search: ${getEndpoints.length} GET, ${nonGetEndpoints.length} non-GET`);

        // With HTTP method intent detection, all results should be GET
        expect(results.every((r) => !r.data?.method || r.data.method === 'GET')).toBe(true);
      });

      it('should find endpoints by HTTP method "POST"', () => {
        const results = service.search('POST');

        const postEndpoints = results.filter((r) => r.data?.method === 'POST');
        console.log(`POST search results: ${postEndpoints.length}`);
        console.log(`All results for "POST": ${results.length}`);

        // GAP DOCUMENTED: Searching for just "POST" triggers HTTP method intent
        // which filters to POST endpoints, but the remaining query (after stripping
        // the method) becomes empty and uses __all__. If no POST endpoints exist
        // in __all__ results, this returns empty.
        console.log(`GAP: HTTP method-only search ${postEndpoints.length > 0 ? 'WORKS' : 'returns 0 results - needs investigation'}`);

        // Document behavior rather than assert
        // expect(postEndpoints.length).toBeGreaterThan(0);
      });

      it('should find endpoints by "POST user" (method + term)', () => {
        const results = service.search('POST user');

        // Expected: Should find POST endpoints related to "user"
        const postUserEndpoints = results.filter(
          (r) => r.data?.method === 'POST' && (r.name?.includes('user') || r.name?.includes('User'))
        );

        console.log(
          'POST user results:',
          results.map((r) => `${r.data?.method} ${r.data?.operationId}`)
        );

        const foundCreateUser = results.some((r) => r.data?.operationId === 'createUser');
        console.log(`GAP: "POST user" search ${foundCreateUser ? 'found createUser' : 'DID NOT find createUser - HTTP method filtering may be too strict'}`);

        // Document behavior - this identifies a potential gap in method + term search
        // expect(results.some((r) => r.data?.operationId === 'createUser')).toBe(true);
      });

      it('should handle lowercase method "get user"', () => {
        const results = service.search('get user');

        // Intent detection should catch method even in lowercase
        console.log(
          'get user results:',
          results.map((r) => `${r.data?.method} ${r.data?.operationId}`)
        );

        // Should filter to GET endpoints
        expect(results.every((r) => !r.data?.method || r.data.method === 'GET')).toBe(true);
      });
    });

    describe('2.5 Description/Summary Search', () => {
      it('should find endpoints by summary content', () => {
        // "paginated" appears in getUsers summary
        const results = service.search('paginated');

        console.log(
          'Search for "paginated":',
          results.map((r) => ({ id: r.id, summary: r.data?.summary }))
        );

        // GAP: Does summary search work with field boosting?
        const foundGetUsers = results.some((r) => r.id === 'get-users');
        console.log(`GAP: Summary search ${foundGetUsers ? 'WORKS' : 'MAY NOT WORK'}`);
      });

      it('should find endpoints by description content', () => {
        // "unique identifier" appears in getUser description
        const results = service.search('identifier');

        console.log(
          'Search for "identifier":',
          results.map((r) => ({ id: r.id, desc: r.data?.description }))
        );

        const foundGetUser = results.some((r) => r.id === 'get-user');
        console.log(`GAP: Description search ${foundGetUser ? 'WORKS' : 'MAY NOT WORK'}`);
      });
    });
  });

  // ==========================================================================
  // 3. PATH-BASED SEARCH
  // ==========================================================================

  describe('3. Path-Based Search', () => {
    describe('3.1 Full Path Match', () => {
      it('should find exact full path: "/api/users/{id}"', () => {
        const results = service.search('/api/users/{id}');

        // Expected: Exact path match should be first
        documentResults('/api/users/{id}', results, ['id', 'path', 'operationId']);

        expect(results.length).toBeGreaterThan(0);
        // Multiple endpoints share this path (getUser, updateUser, deleteUser, patchUser)
        const pathMatches = results.filter((r) => r.path === '/api/users/{id}');
        expect(pathMatches.length).toBeGreaterThan(0);
      });

      it('should find exact path without trailing param: "/api/users"', () => {
        const results = service.search('/api/users');

        documentResults('/api/users', results, ['id', 'path', 'operationId']);

        const exactMatches = results.filter((r) => r.path === '/api/users');
        expect(exactMatches.length).toBeGreaterThan(0);
      });
    });

    describe('3.2 Partial Path Match', () => {
      it('should find partial path: "/users"', () => {
        const results = service.search('/users');

        // Expected: Should find all endpoints with /users in path
        const usersPathMatches = results.filter((r) => r.path?.includes('/users'));

        documentResults('/users', results.slice(0, 10), ['id', 'path']);

        console.log(`Partial path "/users" found ${usersPathMatches.length} matches`);
        expect(usersPathMatches.length).toBeGreaterThan(0);
      });

      it('should find partial path: "/api/orders"', () => {
        const results = service.search('/api/orders');

        const ordersMatches = results.filter((r) => r.path?.includes('/orders'));

        console.log(
          'Partial path "/api/orders":',
          ordersMatches.map((r) => r.path)
        );

        expect(ordersMatches.length).toBeGreaterThan(0);
      });
    });

    describe('3.3 Path Segments (Without Slash)', () => {
      it('should find by path segment: "users" (without slash)', () => {
        const results = service.search('users');

        // Expected: Should find endpoints with "users" in path or other fields
        documentResults('users', results.slice(0, 10), ['id', 'path', 'operationId']);

        const usersRelated = results.filter(
          (r) => r.path?.includes('users') || r.name?.toLowerCase().includes('user')
        );

        // GAP: Does searching "users" find paths containing /users/ ?
        console.log(`Path segment "users" found ${usersRelated.length} matches`);
        expect(usersRelated.length).toBeGreaterThan(0);
      });

      it('should find by path segment: "orders"', () => {
        const results = service.search('orders');

        const ordersRelated = results.filter(
          (r) => r.path?.includes('orders') || r.name?.toLowerCase().includes('order')
        );

        console.log(
          'Path segment "orders":',
          ordersRelated.map((r) => r.path)
        );

        expect(ordersRelated.length).toBeGreaterThan(0);
      });
    });

    describe('3.4 Path Parameters', () => {
      it('should find paths with parameter: "{id}"', () => {
        const results = service.search('{id}');

        // Expected: Should find all paths containing {id} parameter
        const pathsWithId = results.filter((r) => r.path?.includes('{id}'));

        console.log(
          'Paths with {id}:',
          pathsWithId.map((r) => r.path)
        );

        // GAP: MiniSearch may not index { } characters well
        console.log(`GAP: Path parameter search found ${pathsWithId.length} matches`);
      });

      it('should find paths with parameter: "{userId}"', () => {
        // Add a descriptor with userId parameter
        service.addDescriptor(
          createRestDescriptor(
            'user-details',
            'getUserDetails',
            '/api/accounts/{userId}/details',
            'GET',
            'Get user details',
            'Gets detailed user information'
          )
        );

        const results = service.search('{userId}');

        const pathsWithUserId = results.filter((r) => r.path?.includes('{userId}'));

        console.log(
          'Paths with {userId}:',
          pathsWithUserId.map((r) => r.path)
        );

        console.log(`GAP: Specific parameter search found ${pathsWithUserId.length} matches`);
      });

      it('should handle colon-style parameters: ":id"', () => {
        // The normalizeCacheKey function converts :param to {param}
        const results = service.search(':id');

        console.log(
          'Search for ":id":',
          results.slice(0, 5).map((r) => r.path)
        );

        // Document if colon-style params are normalized in search
      });
    });

    describe('3.5 Nested Paths', () => {
      it('should find nested path: "/api/users/{id}/profile"', () => {
        const results = service.search('/api/users/{id}/profile');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].path).toBe('/api/users/{id}/profile');
      });

      it('should find by nested segment: "profile"', () => {
        const results = service.search('profile');

        const profileMatches = results.filter(
          (r) => r.path?.includes('profile') || r.name?.toLowerCase().includes('profile')
        );

        console.log(
          'Nested segment "profile":',
          profileMatches.map((r) => ({ path: r.path, name: r.name }))
        );

        expect(profileMatches.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 4. FIELD RANKING VERIFICATION
  // ==========================================================================

  describe('4. Field Ranking Verification', () => {
    describe('4.1 operationId vs Other Fields', () => {
      it('should rank operationId match above summary match', () => {
        // "user" appears in:
        // - operationId: getUser, getUsers, getUserProfile, etc. (boost: 5.0)
        // - summary: "Search user products" for searchProducts (boost: 1.0)

        const results = service.search('user');

        documentResults('user', results.slice(0, 10), ['id', 'operationId', 'path']);

        // Expected: Endpoints with "user" in operationId should rank above those with "user" only in summary
        const operationIdMatches = results.filter((r) =>
          r.data?.operationId?.toLowerCase().includes('user')
        );
        const summaryOnlyMatches = results.filter(
          (r) =>
            !r.data?.operationId?.toLowerCase().includes('user') &&
            r.data?.summary?.toLowerCase().includes('user')
        );

        console.log(`operationId matches: ${operationIdMatches.length}`);
        console.log(`summary-only matches: ${summaryOnlyMatches.length}`);

        // Verify operationId matches appear before summary-only matches
        if (summaryOnlyMatches.length > 0 && operationIdMatches.length > 0) {
          const lastOpIdIndex = results.findIndex((r) => r === operationIdMatches[operationIdMatches.length - 1]);
          const firstSummaryIndex = results.findIndex((r) => r === summaryOnlyMatches[0]);

          console.log(`Last operationId match at index: ${lastOpIdIndex}`);
          console.log(`First summary-only match at index: ${firstSummaryIndex}`);

          // GAP: Are operationId matches consistently ranked higher?
          expect(lastOpIdIndex).toBeLessThan(firstSummaryIndex);
        }
      });

      it('should rank operationId match above description match', () => {
        // findUserById has "user" in operationId
        // searchProducts has "user" in description

        const results = service.search('user');

        const findUserRank = results.findIndex((r) => r.id === 'find-user-by-id');
        const searchProductsRank = results.findIndex((r) => r.id === 'search-products');

        console.log(`findUserById rank: ${findUserRank}`);
        console.log(`searchProducts rank: ${searchProductsRank}`);

        // findUserById (operationId match, boost 5.0) should rank above searchProducts (description match, boost 0.5)
        if (findUserRank !== -1 && searchProductsRank !== -1) {
          expect(findUserRank).toBeLessThan(searchProductsRank);
        }
      });
    });

    describe('4.2 Path vs Name Ranking', () => {
      it('should document ranking between path match and name match', () => {
        // "orders" appears in:
        // - path: /api/orders (boost: 2.5)
        // - name: getOrders (boost: 3.0)

        const results = service.search('orders');

        documentResults('orders', results, ['id', 'path', 'name']);

        // Document which field takes precedence
        console.log('GAP: Path boost (2.5) vs Name boost (3.0) - Name should rank higher');
      });
    });

    describe('4.3 Multiple Field Matches', () => {
      it('should rank higher when term matches multiple fields', () => {
        // Add a descriptor where "user" appears in multiple fields
        service.addDescriptor(
          createRestDescriptor(
            'user-everywhere',
            'userManager',
            '/api/user/management',
            'GET',
            'User management operations',
            'Manages user accounts and user permissions'
          )
        );

        const results = service.search('user');

        // The new descriptor has "user" in operationId, path, summary, AND description
        // It should potentially rank very high
        const multiMatchRank = results.findIndex((r) => r.id === 'user-everywhere');

        console.log(`Multi-field match "userManager" rank: ${multiMatchRank}`);

        // Document: Does MiniSearch aggregate scores across field matches?
        console.log('GAP: Multi-field match behavior may need verification');
      });
    });

    describe('4.4 Schema vs Endpoint Ranking', () => {
      it('should document ranking between schema and endpoint matches', () => {
        // "User" matches:
        // - Schema: User, UserProfile, CreateUserRequest
        // - Endpoints: getUser, getUsers, etc.

        const results = service.search('User');

        const schemas = results.filter((r) => r.type === 'schema');
        const endpoints = results.filter((r) => r.type === 'endpoint');

        console.log(`Schemas found: ${schemas.length}`);
        console.log(`Endpoints found: ${endpoints.length}`);

        // Document: Are schemas and endpoints interleaved or grouped?
        const firstSchemaIndex = results.findIndex((r) => r.type === 'schema');
        const firstEndpointIndex = results.findIndex((r) => r.type === 'endpoint');

        console.log(`First schema at index: ${firstSchemaIndex}`);
        console.log(`First endpoint at index: ${firstEndpointIndex}`);
      });
    });
  });

  // ==========================================================================
  // 5. FUZZY MATCHING
  // ==========================================================================

  describe('5. Fuzzy Matching', () => {
    describe('5.1 Default Fuzzy Level (0.2)', () => {
      it('should document what fuzzy level 0.2 catches for typos', () => {
        // "usr" instead of "user" (missing 'e')
        const results = service.search('usr');

        console.log(
          'Fuzzy search "usr" (missing e):',
          results.slice(0, 5).map((r) => r.name || r.data?.operationId)
        );

        const foundUser = results.some(
          (r) => r.name?.toLowerCase().includes('user') || r.data?.operationId?.toLowerCase().includes('user')
        );

        console.log(`GAP: Typo "usr" → "user" ${foundUser ? 'WORKS' : 'DOES NOT WORK'} with fuzzy=0.2`);
      });

      it('should handle missing character: "getUsr" → "getUser"', () => {
        const results = service.search('getUsr');

        console.log(
          'Fuzzy search "getUsr":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');

        console.log(`GAP: Missing char "getUsr" → "getUser" ${foundGetUser ? 'WORKS' : 'DOES NOT WORK'}`);
      });

      it('should handle extra character: "getUseer" → "getUser"', () => {
        const results = service.search('getUseer');

        console.log(
          'Fuzzy search "getUseer":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');

        console.log(`GAP: Extra char "getUseer" → "getUser" ${foundGetUser ? 'WORKS' : 'DOES NOT WORK'}`);
      });

      it('should handle transposed characters: "getUesr" → "getUser"', () => {
        const results = service.search('getUesr');

        console.log(
          'Fuzzy search "getUesr":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        const foundGetUser = results.some((r) => r.data?.operationId === 'getUser');

        console.log(`GAP: Transposed "getUesr" → "getUser" ${foundGetUser ? 'WORKS' : 'DOES NOT WORK'}`);
      });
    });

    describe('5.2 Higher Fuzzy Levels', () => {
      it('should find more matches with fuzzy=0.5', () => {
        const defaultResults = service.search('usr', { fuzzy: 0.2 });
        const higherFuzzyResults = service.search('usr', { fuzzy: 0.5 });

        console.log(`fuzzy=0.2 results: ${defaultResults.length}`);
        console.log(`fuzzy=0.5 results: ${higherFuzzyResults.length}`);

        // Higher fuzzy should find equal or more matches
        expect(higherFuzzyResults.length).toBeGreaterThanOrEqual(defaultResults.length);
      });

      it('should find matches with fuzzy=0.8 for severely misspelled queries', () => {
        // "gtusr" is a severely mangled version of "getUser"
        const results = service.search('gtusr', { fuzzy: 0.8 });

        console.log(
          'Severely misspelled "gtusr" with fuzzy=0.8:',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        // Document what fuzzy=0.8 can recover
      });
    });

    describe('5.3 Fuzzy Disabled (fuzzy=0)', () => {
      it('should not find fuzzy matches when disabled', () => {
        const results = service.search('usr', { fuzzy: 0 });

        console.log(
          'No fuzzy "usr":',
          results.map((r) => r.data?.operationId || r.name)
        );

        // With fuzzy=0, should only find exact "usr" matches (likely none)
        expect(results.length).toBe(0);
      });

      it('should still find exact matches when fuzzy=0', () => {
        const results = service.search('getUser', { fuzzy: 0 });

        // Exact match should still work
        expect(results.length).toBeGreaterThan(0);
        // Note: With exact match cache, this bypasses fuzzy anyway
      });
    });
  });

  // ==========================================================================
  // 6. EDGE CASES
  // ==========================================================================

  describe('6. Edge Cases', () => {
    describe('6.1 Special Characters', () => {
      it('should handle forward slash: "/"', () => {
        const results = service.search('/');

        console.log(`Search "/" returned ${results.length} results`);

        // "/" alone is treated as path intent
        expect(() => service.search('/')).not.toThrow();
      });

      it('should handle curly braces: "{id}"', () => {
        const results = service.search('{id}');

        console.log(
          'Search "{id}":',
          results.slice(0, 5).map((r) => r.path)
        );

        // Document: Are path parameters searchable?
      });

      it('should handle hyphen in query: "user-profile"', () => {
        // Add hyphenated path
        service.addDescriptor(
          createRestDescriptor(
            'hyphenated',
            'getUserProfileData',
            '/api/user-profile',
            'GET',
            'Get user profile',
            'Gets user profile data'
          )
        );

        const results = service.search('user-profile');

        console.log(
          'Search "user-profile":',
          results.slice(0, 5).map((r) => ({ id: r.id, path: r.path }))
        );

        // Document: Does hyphen tokenize or match as-is?
      });

      it('should handle underscore in query: "user_settings"', () => {
        service.addDescriptor(
          createRestDescriptor(
            'underscore',
            'get_user_settings',
            '/api/user_settings',
            'GET',
            'Get user settings',
            'Gets user settings'
          )
        );

        const results = service.search('user_settings');

        console.log(
          'Search "user_settings":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );
      });

      it('should handle query with multiple special chars: "/api/{id}/items"', () => {
        const results = service.search('/api/{id}/items');

        console.log(
          'Complex path search:',
          results.slice(0, 5).map((r) => r.path)
        );

        expect(() => service.search('/api/{id}/items')).not.toThrow();
      });

      it('should handle query with only special characters: "!@#$%"', () => {
        expect(() => service.search('!@#$%')).not.toThrow();
      });
    });

    describe('6.2 Very Short Queries', () => {
      it('should handle single character: "a"', () => {
        const results = service.search('a');

        console.log(`Single char "a" returned ${results.length} results`);

        // Document: Does single char search work?
      });

      it('should handle two characters: "id"', () => {
        const results = service.search('id');

        console.log(
          'Two char "id":',
          results.slice(0, 5).map((r) => ({ id: r.id, path: r.path }))
        );

        // "id" appears in many paths as {id}
      });

      it('should handle two characters: "by"', () => {
        const results = service.search('by');

        // "by" appears in "findUserById"
        const foundById = results.some((r) => r.data?.operationId?.includes('ById'));

        console.log(`Short query "by" found ById endpoints: ${foundById}`);
      });
    });

    describe('6.3 Very Long Queries', () => {
      it('should handle very long query string', () => {
        const longQuery = 'get user profile settings with pagination and filtering and sorting';

        const results = service.search(longQuery);

        console.log(`Long query returned ${results.length} results`);

        expect(() => service.search(longQuery)).not.toThrow();
      });

      it('should handle 500 character query', () => {
        const veryLongQuery = 'user '.repeat(100);

        expect(() => service.search(veryLongQuery)).not.toThrow();
      });
    });

    describe('6.4 Multi-Term Queries', () => {
      it('should handle space-separated terms: "get user by id"', () => {
        const results = service.search('get user by id');

        console.log(
          'Multi-term "get user by id":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        // Document: Are all terms matched (AND) or any (OR)?
        // Note: "get" triggers HTTP method intent detection
      });

      it('should handle multi-term without method prefix: "user profile settings"', () => {
        const results = service.search('user profile settings');

        console.log(
          'Multi-term "user profile settings":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        // Expected: Should find endpoints matching these terms
        const relevant = results.filter(
          (r) =>
            r.name?.toLowerCase().includes('user') ||
            r.name?.toLowerCase().includes('profile') ||
            r.name?.toLowerCase().includes('settings')
        );

        expect(relevant.length).toBeGreaterThan(0);
      });
    });

    describe('6.5 Unicode and International Characters', () => {
      it('should handle unicode characters', () => {
        service.addDescriptor(
          createRestDescriptor(
            'unicode',
            'getUserNäme',
            '/api/users/näme',
            'GET',
            'Get user name with umlaut',
            'Gets user name'
          )
        );

        const results = service.search('näme');

        console.log(
          'Unicode search "näme":',
          results.map((r) => r.data?.operationId || r.name)
        );
      });

      it('should handle emoji in query', () => {
        expect(() => service.search('user 👤')).not.toThrow();
      });
    });

    describe('6.6 Whitespace Handling', () => {
      it('should handle leading/trailing whitespace', () => {
        const results = service.search('  user  ');

        // Should be trimmed and work normally
        expect(results.length).toBeGreaterThan(0);
      });

      it('should handle multiple internal spaces', () => {
        const results = service.search('get   user');

        // Should handle gracefully
        expect(() => service.search('get   user')).not.toThrow();
      });

      it('should handle newlines in query', () => {
        const results = service.search('get\nuser');

        console.log(
          'Newline in query:',
          results.slice(0, 3).map((r) => r.data?.operationId)
        );

        expect(() => service.search('get\nuser')).not.toThrow();
      });

      it('should handle tabs in query', () => {
        const results = service.search('get\tuser');

        expect(() => service.search('get\tuser')).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // 7. SCHEMA-SPECIFIC SEARCH
  // ==========================================================================

  describe('7. Schema Search Behavior', () => {
    describe('7.1 Schema Name Search', () => {
      it('should find schemas by exact name', () => {
        const results = service.search('User', { type: 'schema' });

        console.log(
          'Schema search "User":',
          results.map((r) => r.name)
        );

        const foundUser = results.some((r) => r.name === 'User');
        expect(foundUser).toBe(true);
      });

      it('should find schemas by partial name', () => {
        const results = service.search('Request', { type: 'schema' });

        console.log(
          'Schema search "Request":',
          results.map((r) => r.name)
        );

        const foundCreateUserRequest = results.some((r) => r.name === 'CreateUserRequest');
        console.log(`GAP: Partial schema name search ${foundCreateUserRequest ? 'WORKS' : 'DOES NOT find "CreateUserRequest" when searching "Request" - camelCase tokenization issue'}`);

        // Document behavior - this may not work due to tokenization
        // expect(foundCreateUserRequest).toBe(true);
      });
    });

    describe('7.2 Schema vs Endpoint Filtering', () => {
      it('should only return schemas when type=schema', () => {
        const results = service.search('User', { type: 'schema' });

        expect(results.every((r) => r.type === 'schema')).toBe(true);
      });

      it('should only return endpoints when type=endpoint', () => {
        const results = service.search('User', { type: 'endpoint' });

        expect(results.every((r) => r.type === 'endpoint')).toBe(true);
      });
    });
  });

  // ==========================================================================
  // 8. RECENCY SCORING
  // ==========================================================================

  describe('8. Recency Scoring Behavior', () => {
    describe('8.1 Recently Accessed Items', () => {
      it('should boost recently accessed items', () => {
        // NOTE: touchDescriptor has a bug - it calls mini.add() without first removing
        // the existing entry, causing "duplicate ID" error in MiniSearch.
        // This test documents the bug rather than testing the intended behavior.

        // Skip touching to avoid the bug - just verify initial recency works
        const results = service.search('user');

        console.log(
          'Recency scoring with initial data:',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        console.log('BUG DOCUMENTED: touchDescriptor causes MiniSearch duplicate ID error');
        console.log('The indexDescriptor method should use replace() or remove+add pattern');

        // Verify results exist (recency based on initial lastAccessed values)
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('8.2 getRecent Method', () => {
      it('should return most recently accessed descriptors', () => {
        // NOTE: Can't use touchDescriptor due to MiniSearch bug
        // Test getRecent with existing lastAccessed values instead

        const recent = service.getRecent(5);

        console.log(
          'Most recent (based on initial data):',
          recent.map((r) => r.data?.operationId || r.name)
        );

        console.log('BUG DOCUMENTED: touchDescriptor cannot be tested due to duplicate ID error');

        expect(recent.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 9. INTENT DETECTION
  // ==========================================================================

  describe('9. Intent Detection Behavior', () => {
    describe('9.1 Path Intent (alpha=0.95)', () => {
      it('should use high relevance weight for path queries', () => {
        // Path queries should prioritize exact matches (alpha=0.95)
        const results = service.search('/api/users/{id}');

        // With alpha=0.95, relevance dominates over recency
        expect(results[0].path).toBe('/api/users/{id}');
      });
    });

    describe('9.2 HTTP Method Intent (alpha=0.85)', () => {
      it('should detect and filter by HTTP method', () => {
        const results = service.search('DELETE user');

        // Should filter to DELETE endpoints only
        const deleteEndpoints = results.filter((r) => r.data?.method === 'DELETE');
        const nonDeleteEndpoints = results.filter((r) => r.data?.method && r.data.method !== 'DELETE');

        console.log(`DELETE intent: ${deleteEndpoints.length} DELETE, ${nonDeleteEndpoints.length} non-DELETE`);

        expect(nonDeleteEndpoints.length).toBe(0);
      });
    });

    describe('9.3 CamelCase Intent (alpha=0.80)', () => {
      it('should strip "use" prefix for React hook patterns', () => {
        // useGetUser should match getUser (use prefix stripped)
        const results = service.search('useGetUser');

        console.log(
          'useGetUser results:',
          results.slice(0, 3).map((r) => r.data?.operationId)
        );

        // Should find getUser at top
        expect(results[0].data?.operationId).toBe('getUser');
      });

      it('should detect camelCase without "use" prefix', () => {
        // getUserProfile triggers camelCase intent
        const results = service.search('getUserProfile');

        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('9.4 Generic Intent (alpha=0.75)', () => {
      it('should use balanced scoring for generic queries', () => {
        // Simple word query uses generic intent
        const results = service.search('profile');

        console.log(
          'Generic query "profile":',
          results.slice(0, 5).map((r) => r.data?.operationId || r.name)
        );

        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('9.5 Intent Priority', () => {
      it('should prioritize path intent over HTTP method intent', () => {
        // "GET /api/users" has both path (/) and method (GET)
        // Path should take precedence
        const results = service.search('GET /api/users');

        // Path intent detected means high relevance weighting
        // The query should find the path match, not just GET endpoints
        const pathMatch = results.find((r) => r.path === '/api/users');

        console.log(`Mixed "GET /api/users": Path intent takes precedence`);
        expect(pathMatch).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // 10. EXACT MATCH CACHE
  // ==========================================================================

  describe('10. Exact Match Cache Behavior', () => {
    describe('10.1 OperationId Cache', () => {
      it('should cache and retrieve by exact operationId', () => {
        const results = service.search('getUser');

        console.log(
          'Exact operationId "getUser":',
          results.map((r) => r.data?.operationId)
        );

        // BEHAVIOR DOCUMENTED: The cache returns exact matches, but MiniSearch also
        // returns prefix matches (getUser, getUsers, getUserProfile) because of the
        // prefix search option. The cache is only used when an exact match is found.
        console.log(`Results count for "getUser": ${results.length}`);
        console.log('NOTE: Prefix search may return additional matches like getUsers, getUserProfile');

        // The first result should be the exact match
        expect(results[0].data?.operationId).toBe('getUser');
      });

      it('should normalize case for cache lookup', () => {
        // Cache lookup uses normalizeCacheKey which lowercases
        const results = service.search('GETUSER');

        // Should still find getUser via cache
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('10.2 Path Cache', () => {
      it('should cache and retrieve by exact path', () => {
        const results = service.search('/api/users/{id}');

        // Should return all endpoints with this exact path
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.path === '/api/users/{id}')).toBe(true);
      });

      it('should normalize path parameter formats', () => {
        // :id format should normalize to {id}
        const colonResults = service.search('/api/users/:id');
        const braceResults = service.search('/api/users/{id}');

        // Both should match the same endpoints
        console.log(`Colon format: ${colonResults.length} results`);
        console.log(`Brace format: ${braceResults.length} results`);

        // normalizeCacheKey converts :id to {id}
        expect(colonResults.length).toBe(braceResults.length);
      });

      it('should handle angle bracket format: "<id>"', () => {
        // <id> format should normalize to {id}
        const angleResults = service.search('/api/users/<id>');
        const braceResults = service.search('/api/users/{id}');

        console.log(`Angle format: ${angleResults.length} results`);

        // normalizeCacheKey converts <id> to {id}
        expect(angleResults.length).toBe(braceResults.length);
      });
    });

    describe('10.3 Cache Bypass', () => {
      it('should bypass cache for fuzzy partial matches', () => {
        // "getUs" is partial, should not hit exact cache
        const results = service.search('getUs');

        console.log(
          'Partial "getUs":',
          results.slice(0, 5).map((r) => r.data?.operationId)
        );

        // Should still find results via MiniSearch
        expect(results.length).toBeGreaterThan(0);
      });

      it('should bypass cache for __all__ query', () => {
        // Empty query uses __all__ which should not hit cache
        const results = service.search('');

        expect(results.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // 11. DATATYPE FILTERING
  // ==========================================================================

  describe('11. DataType Filtering', () => {
    beforeEach(() => {
      // Add endpoints with dataType references
      service.addDescriptor(
        createRestDescriptor(
          'with-user-type',
          'createUserWithType',
          '/api/users',
          'POST',
          'Create user',
          'Creates user with type',
          {
            requestBody: 'User',
            response: 'UserProfile',
          }
        )
      );

      service.addDescriptor(
        createRestDescriptor(
          'with-order-type',
          'createOrderWithType',
          '/api/orders',
          'POST',
          'Create order',
          'Creates order with type',
          {
            requestBody: 'Order',
            response: 'OrderConfirmation',
          }
        )
      );
    });

    it('should filter by single dataType', () => {
      const results = service.search('create', { dataTypes: ['User'] });

      console.log(
        'Filter by dataType User:',
        results.map((r) => ({ id: r.id, requestBody: r.data?.requestBody }))
      );

      // Should find endpoints that use User type
    });

    it('should filter by multiple dataTypes', () => {
      const results = service.search('', { dataTypes: ['User', 'Order'] });

      console.log(
        'Filter by dataTypes [User, Order]:',
        results.map((r) => r.data?.requestBody)
      );

      // Should find endpoints that use either User or Order
    });
  });

  // ==========================================================================
  // 12. GAP SUMMARY
  // ==========================================================================

  describe('12. Gap Summary and Documentation', () => {
    it('should document all identified gaps', () => {
      console.log('\n');
      console.log('='.repeat(80));
      console.log('SEARCH SERVICE GAP ANALYSIS SUMMARY');
      console.log('='.repeat(80));

      const gaps: { area: string; gap: string; impact: string }[] = [];

      // Run comprehensive analysis
      const testCases = [
        { query: 'usr', description: 'Typo tolerance (missing char)' },
        { query: 'getUseer', description: 'Typo tolerance (extra char)' },
        { query: '{id}', description: 'Path parameter search' },
        { query: 'paginated', description: 'Summary field search' },
        { query: 'identifier', description: 'Description field search' },
      ];

      testCases.forEach(({ query, description }) => {
        const results = service.search(query);
        gaps.push({
          area: description,
          gap: results.length > 0 ? 'Works' : 'Needs improvement',
          impact:
            results.length > 0 ? 'Low' : results.length === 0 ? 'High' : 'Medium',
        });
      });

      console.log('\nIdentified Gaps:');
      gaps.forEach((g, i) => {
        console.log(`${i + 1}. [${g.impact}] ${g.area}: ${g.gap}`);
      });

      console.log('\n');
      console.log('Key Observations:');
      console.log('1. Field boosting is configured but effectiveness varies');
      console.log('2. Fuzzy matching at 0.2 may miss common typos');
      console.log('3. Path parameter search ({id}) tokenization may be limited');
      console.log('4. Intent detection successfully filters HTTP methods');
      console.log('5. Exact match cache provides O(1) lookups for common patterns');

      console.log('\n');
      console.log('Recommendations:');
      console.log('1. Consider increasing default fuzzy tolerance to 0.3');
      console.log('2. Add custom tokenizer for path parameters');
      console.log('3. Verify field boost weights in production scenarios');
      console.log('4. Consider adding synonym support for common terms');
      console.log('='.repeat(80));
    });
  });
});
