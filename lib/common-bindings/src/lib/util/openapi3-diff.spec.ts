import { OpenAPIV3_1 } from 'openapi-types';
import compareSwaggerDocs, {
  compareParameters,
  compareRequestBodies,
  compareResponses,
  compareMethods
} from './openapi3-diff';

import {describe, expect, it} from 'vitest'

describe('openapi3-diff', () => {
  // Mock OpenAPI documents for testing
  const createBasicOpenAPIDoc = (): OpenAPIV3_1.Document => ({
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {}
    },
    tags: [],
    servers: []
  });

  describe('compareParameters', () => {
    it('should return undefined when parameters are identical', () => {
      const oldMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } }
        ]
      };
      const newMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } }
        ]
      };

      const result = compareParameters(oldMethod, newMethod);
      expect(result).toBeUndefined();
    });

    it('should detect added parameters', () => {
      const oldMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } }
        ]
      };
      const newMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } },
          { name: 'param2', in: 'query', schema: { type: 'number' } }
        ]
      };

      const result = compareParameters(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.added).toHaveLength(1);
      expect(result?.added?.[0].name).toBe('param2');
    });

    it('should detect removed parameters', () => {
      const oldMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } },
          { name: 'param2', in: 'query', schema: { type: 'number' } }
        ]
      };
      const newMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } }
        ]
      };

      const result = compareParameters(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.removed).toHaveLength(1);
      expect(result?.removed?.[0].name).toBe('param2');
    });

    it('should detect modified parameters', () => {
      const oldMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'string' } }
        ]
      };
      const newMethod = {
        parameters: [
          { name: 'param1', in: 'query', schema: { type: 'number' } }
        ]
      };

      const result = compareParameters(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.modified).toHaveLength(1);
      expect(result?.modified?.[0].name).toBe('param1');
    });
  });

  describe('compareRequestBodies', () => {
    it('should return undefined when request bodies are identical', () => {
      const oldMethod = {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      };
      const newMethod = {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      };

      const result = compareRequestBodies(oldMethod, newMethod);
      expect(result).toBeUndefined();
    });

    it('should detect changes in request bodies', () => {
      const oldMethod = {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        }
      };
      const newMethod = {
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'array' }
            }
          }
        }
      };

      const result = compareRequestBodies(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.old).toEqual(oldMethod.requestBody);
      expect(result?.new).toEqual(newMethod.requestBody);
    });
  });

  describe('compareResponses', () => {
    it('should return undefined when responses are identical', () => {
      const oldMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      const newMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const result = compareResponses(oldMethod, newMethod);
      expect(result).toBeUndefined();
    });

    it('should detect added responses', () => {
      const oldMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      const newMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const result = compareResponses(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.added).toContain('400');
    });

    it('should detect removed responses', () => {
      const oldMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      const newMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const result = compareResponses(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.removed).toContain('400');
    });

    it('should detect modified responses', () => {
      const oldMethod = {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };
      const newMethod = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const result = compareResponses(oldMethod, newMethod);
      expect(result).toBeDefined();
      expect(result?.modified).toHaveLength(1);
      expect(result?.modified?.[0].statusCode).toBe('200');
    });
  });

  describe('compareMethods', () => {
    it('should return undefined when methods are identical', () => {
      const oldMethods = {
        get: {
          parameters: [
            { name: 'param1', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'OK'
            }
          }
        }
      };
      const newMethods = {
        get: {
          parameters: [
            { name: 'param1', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'OK'
            }
          }
        }
      };

      const result = compareMethods('/test', oldMethods, newMethods);
      expect(result).toBeUndefined();
    });

    it('should detect added methods', () => {
      const oldMethods = {
        get: {
          responses: {
            '200': {
              description: 'OK'
            }
          }
        }
      };
      const newMethods = {
        get: {
          responses: {
            '200': {
              description: 'OK'
            }
          }
        },
        post: {
          responses: {
            '201': {
              description: 'Created'
            }
          }
        }
      };

      const result = compareMethods('/test', oldMethods, newMethods);
      expect(result).toBeDefined();
      expect(result?.methods.added).toContain('post');
    });

    it('should detect removed methods', () => {
      const oldMethods = {
        get: {
          responses: {
            '200': {
              description: 'OK'
            }
          }
        },
        post: {
          responses: {
            '201': {
              description: 'Created'
            }
          }
        }
      };
      const newMethods = {
        get: {
          responses: {
            '200': {
              description: 'OK'
            }
          }
        }
      };

      const result = compareMethods('/test', oldMethods, newMethods);
      expect(result).toBeDefined();
      expect(result?.methods.removed).toContain('post');
    });

    it('should detect modified methods', () => {
      const oldMethods = {
        get: {
          responses: {
            '200': {
              description: 'OK'
            }
          }
        }
      };
      const newMethods = {
        get: {
          responses: {
            '200': {
              description: 'Success'
            }
          }
        }
      };

      const result = compareMethods('/test', oldMethods, newMethods);
      expect(result).toBeDefined();
      expect(result?.methods.modified).toHaveLength(1);
      expect(result?.methods.modified?.[0].method).toBe('get');
    });
  });

  describe('compareSwaggerDocs', () => {
    it('should compare two identical documents and return an empty object', () => {
      const oldDoc = createBasicOpenAPIDoc();
      const newDoc = createBasicOpenAPIDoc();

      const result = compareSwaggerDocs(oldDoc, newDoc);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should detect changes in paths', () => {
      const oldDoc = createBasicOpenAPIDoc();
      const newDoc = createBasicOpenAPIDoc();

      oldDoc.paths = {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'OK'
              }
            }
          }
        }
      };

      newDoc.paths = {
        '/test': {
          get: {
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        },
        '/new': {
          get: {
            responses: {
              '200': {
                description: 'OK'
              }
            }
          }
        }
      };

      const result = compareSwaggerDocs(oldDoc, newDoc);
      expect(result.paths).toBeDefined();
      expect(result.paths?.added).toContain('/new');
      expect(result.paths?.modified).toHaveLength(1);
    });

    it('should detect changes in components', () => {
      const oldDoc = createBasicOpenAPIDoc();
      const newDoc = createBasicOpenAPIDoc();

      if (oldDoc.components) {
        oldDoc.components.schemas = {
          Test: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        };
      }

      if (newDoc.components) {
        newDoc.components.schemas = {
          Test: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          NewSchema: {
            type: 'object'
          }
        };
      }

      const result = compareSwaggerDocs(oldDoc, newDoc);
      expect(result.components).toBeDefined();
      expect(result.components?.added).toContain('NewSchema');
      expect(result.components?.modified).toHaveLength(1);
    });
  });
});