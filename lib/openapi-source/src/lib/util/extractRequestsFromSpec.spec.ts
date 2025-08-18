import { OpenAPIV3_1 } from 'openapi-types';
import { ExtractRequestsService } from './extract-requests.service';
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock the ref-management dependencies
vi.mock('./ref-management', () => ({
  deref: vi.fn((spec: OpenAPIV3_1.Document) => <T>(obj: T): T => obj),
  isRef: vi.fn((obj: any): obj is OpenAPIV3_1.ReferenceObject => !!obj?.$ref)
}));

describe('extractRequestsFromSpec', () => {
  let basicSpec: OpenAPIV3_1.Document;
  let service: ExtractRequestsService;

  beforeEach(() => {
    service = new ExtractRequestsService();
    basicSpec = {
      openapi: '3.1.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          CreateUserRequest: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    };
  });

  it('should return empty array for spec with no paths', () => {
    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result.restData).toEqual([]);
    expect(result.skippedEndpoints).toEqual([]);
  });

  it('should extract GET request without parameters', () => {
    basicSpec.paths = {
      '/users': {
        get: {
          operationId: 'getUsers',
          summary: 'Get all users',
          description: 'Retrieve a list of all users',
          tags: ['users'],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  },
                  example: { id: '1', name: 'John' }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      paths: ['users'],
      variables: [],
      requestUrl: '/users',
      operationId: 'getUsers',
      method: 'get',
      description: 'Retrieve a list of all users',
      summary: 'Get all users',
      response: 'User',
      responseType: 'application/json',
      errorResponses: {},
      responseExamples: {
        default: '{"id":"1","name":"John"}'
      }
    });
  });

  it('should extract GET request with query parameters', () => {
    basicSpec.paths = {
      '/users': {
        get: {
          operationId: 'getUsersWithParams',
          tags: ['users'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer' }
            },
            {
              name: 'search',
              in: 'query',
              schema: {
                $ref: '#/components/schemas/User'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0].variables).toHaveLength(2);
    expect(result[0].variables?.[0]).toEqual({
      name: 'limit',
      in: 'query',
      ref: 'any'
    });
    expect(result[0].variables?.[1]).toEqual({
      name: 'search',
      in: 'query',
      ref: '#/components/schemas/User'
    });
  });

  it('should extract POST request with request body', () => {
    basicSpec.paths = {
      '/users': {
        post: {
          operationId: 'createUser',
          tags: ['users'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      paths: ['users'],
      variables: [],
      requestUrl: '/users',
      operationId: 'createUser',
      method: 'post',
      description: undefined,
      summary: undefined,
      response: 'User',
      responseType: 'application/json',
      errorResponses: {
        'application/json': {
          response: 'ErrorResponse',
          responseType: '400'
        }
      },
      responseExamples: {
        default: undefined
      },
      contentType: 'application/json',
      requestBody: 'CreateUserRequest'
    });
  });

  it('should extract DELETE request', () => {
    basicSpec.paths = {
      '/users/{id}': {
        delete: {
          operationId: 'deleteUser',
          tags: ['users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              schema: { type: 'string' }
            }
          ]
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      paths: ['users'],
      variables: [
        {
          name: 'id',
          in: 'path',
          ref: 'any'
        }
      ],
      requestUrl: '/users/{id}',
      operationId: 'deleteUser',
      method: 'delete',
      description: undefined,
      summary: undefined
    });
  });

  it('should extract PUT request without request body', () => {
    basicSpec.paths = {
      '/users/{id}/activate': {
        put: {
          operationId: 'activateUser',
          tags: ['users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0].requestBody).toBeUndefined();
    expect(result[0].contentType).toBeUndefined();
    expect(result[0].response).toBe('User');
  });

  it('should handle multiple content types in request body', () => {
    basicSpec.paths = {
      '/upload': {
        post: {
          operationId: 'uploadFile',
          tags: ['files'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest'
                }
              },
              'multipart/form-data': {
                schema: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(2);
    expect(result[0].contentType).toBe('application/json');
    expect(result[0].requestBody).toBe('CreateUserRequest');
    expect(result[1].contentType).toBe('multipart/form-data');
    expect(result[1].requestBody).toBe('User');
  });

  it('should handle response examples', () => {
    basicSpec.paths = {
      '/users': {
        get: {
          operationId: 'getUsers',
          tags: ['users'],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  },
                  examples: {
                    user1: { value: { id: '1', name: 'John' } },
                    user2: { value: { id: '2', name: 'Jane' } }
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0].responseExamples).toEqual({
      user1: '{"value":{"id":"1","name":"John"}}',
      user2: '{"value":{"id":"2","name":"Jane"}}'
    });
  });

  it('should handle error responses with different status codes', () => {
    basicSpec.paths = {
      '/users': {
        post: {
          operationId: 'createUser',
          tags: ['users'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                '*/*': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0].errorResponses).toEqual({
      'application/json': {
        response: 'ErrorResponse',
        responseType: '400'
      },
      '*/*': {
        response: 'ErrorResponse',
        responseType: '401'
      }
    });
  });

  it('should skip operations without operationId', () => {
    basicSpec.paths = {
      '/users': {
        get: {
          // Missing operationId
          responses: {
            '200': {
              description: 'Success'
            }
          }
        },
        post: {
          operationId: 'createUser',
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(1);
    expect(result[0].operationId).toBe('createUser');
  });

  it('should handle empty or missing tags', () => {
    basicSpec.paths = {
      '/users': {
        get: {
          operationId: 'getUsers',
          // No tags
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        },
        post: {
          operationId: 'createUser',
          tags: [], // Empty tags
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(2);
    expect(result[0].paths).toEqual([]);
    expect(result[1].paths).toEqual([]);
  });

  it('should handle missing response content', () => {
    basicSpec.paths = {
      '/users': {
        post: {
          operationId: 'createUser',
          tags: ['users'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created'
              // No content
            }
          }
        }
      }
    };

    const result = service.extractRequestsFromSpec(basicSpec);
    expect(result).toHaveLength(0); // Should not create request without response content
  });

  it('should handle basic function call without errors', () => {
    // Simple test to verify the function can be called
    const emptySpec = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    };
    
    const result = service.extractRequestsFromSpec(emptySpec as any);
    expect(result).toEqual([]);
  });
});