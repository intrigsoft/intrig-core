import { describe, it, expect } from 'vitest';
import {
  formatTabs,
  formatEndpointDocumentation,
  formatSchemaDocumentation,
  extractEndpointRelatedTypes,
  createEndpointResult,
  createSchemaResult,
} from './documentation.js';
import { RestDocumentation, SchemaDocumentation, Tab } from '../types/daemon-api.js';

describe('documentation formatter', () => {
  describe('formatTabs', () => {
    it('should format empty tabs array', () => {
      const result = formatTabs([]);
      expect(result).toBe('');
    });

    it('should format single tab', () => {
      const tabs: Tab[] = [{ name: 'Overview', content: 'This is the overview.' }];
      const result = formatTabs(tabs);

      expect(result).toBe('## Overview\n\nThis is the overview.');
    });

    it('should format multiple tabs', () => {
      const tabs: Tab[] = [
        { name: 'Overview', content: 'Overview content' },
        { name: 'Parameters', content: 'Parameters content' },
      ];
      const result = formatTabs(tabs);

      expect(result).toContain('## Overview');
      expect(result).toContain('Overview content');
      expect(result).toContain('## Parameters');
      expect(result).toContain('Parameters content');
    });

    it('should preserve code blocks in tab content', () => {
      const tabs: Tab[] = [
        {
          name: 'Example',
          content: '```typescript\nconst x = 1;\n```',
        },
      ];
      const result = formatTabs(tabs);

      expect(result).toContain('```typescript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });
  });

  describe('formatEndpointDocumentation', () => {
    const minimalEndpoint: RestDocumentation = {
      id: 'endpoint-1',
      name: 'getUser',
      method: 'GET',
      path: '/api/users/{id}',
      requestUrl: 'http://api.example.com/users/{id}',
      variables: [],
      responseExamples: {},
      tabs: [],
    };

    it('should format minimal endpoint', () => {
      const result = formatEndpointDocumentation(minimalEndpoint);

      expect(result).toContain('# getUser');
      expect(result).toContain('**Method:** `GET`');
      expect(result).toContain('**Path:** `/api/users/{id}`');
    });

    it('should include source when provided', () => {
      const result = formatEndpointDocumentation(minimalEndpoint, 'petstore');

      expect(result).toContain('**Source:** petstore');
    });

    it('should include description when present', () => {
      const endpoint: RestDocumentation = {
        ...minimalEndpoint,
        description: 'Retrieves a user by their ID.',
      };
      const result = formatEndpointDocumentation(endpoint);

      expect(result).toContain('Retrieves a user by their ID.');
    });

    it('should include request body type', () => {
      const endpoint: RestDocumentation = {
        ...minimalEndpoint,
        requestBody: { name: 'CreateUserRequest', id: 'type-1' },
      };
      const result = formatEndpointDocumentation(endpoint);

      expect(result).toContain('**Request Body:** CreateUserRequest');
    });

    it('should include response type', () => {
      const endpoint: RestDocumentation = {
        ...minimalEndpoint,
        response: { name: 'UserResponse', id: 'type-2' },
      };
      const result = formatEndpointDocumentation(endpoint);

      expect(result).toContain('**Response:** UserResponse');
    });

    it('should include content type', () => {
      const endpoint: RestDocumentation = {
        ...minimalEndpoint,
        contentType: 'application/json',
      };
      const result = formatEndpointDocumentation(endpoint);

      expect(result).toContain('**Content-Type:** `application/json`');
    });

    it('should include request URL', () => {
      const result = formatEndpointDocumentation(minimalEndpoint);

      expect(result).toContain('**Request URL:** `http://api.example.com/users/{id}`');
    });

    it('should format tabs', () => {
      const endpoint: RestDocumentation = {
        ...minimalEndpoint,
        tabs: [
          { name: 'Usage', content: 'How to use this endpoint.' },
          { name: 'Examples', content: 'Example requests.' },
        ],
      };
      const result = formatEndpointDocumentation(endpoint);

      expect(result).toContain('## Usage');
      expect(result).toContain('How to use this endpoint.');
      expect(result).toContain('## Examples');
      expect(result).toContain('Example requests.');
    });
  });

  describe('formatSchemaDocumentation', () => {
    const minimalSchema: SchemaDocumentation = {
      id: 'schema-1',
      name: 'User',
      description: 'A user in the system.',
      jsonSchema: { type: 'object' },
      tabs: [],
      relatedTypes: [],
      relatedEndpoints: [],
    };

    it('should format minimal schema', () => {
      const result = formatSchemaDocumentation(minimalSchema);

      expect(result).toContain('# User');
      expect(result).toContain('A user in the system.');
    });

    it('should include source when provided', () => {
      const result = formatSchemaDocumentation(minimalSchema, 'petstore');

      expect(result).toContain('**Source:** petstore');
    });

    it('should include JSON schema as code block', () => {
      const schema: SchemaDocumentation = {
        ...minimalSchema,
        jsonSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
      };
      const result = formatSchemaDocumentation(schema);

      expect(result).toContain('## JSON Schema');
      expect(result).toContain('```json');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
    });

    it('should format tabs', () => {
      const schema: SchemaDocumentation = {
        ...minimalSchema,
        tabs: [{ name: 'Properties', content: 'Schema properties.' }],
      };
      const result = formatSchemaDocumentation(schema);

      expect(result).toContain('## Properties');
      expect(result).toContain('Schema properties.');
    });

    it('should format related types', () => {
      const schema: SchemaDocumentation = {
        ...minimalSchema,
        relatedTypes: [
          { name: 'Address', id: 'type-address' },
          { name: 'PhoneNumber', id: 'type-phone' },
        ],
      };
      const result = formatSchemaDocumentation(schema);

      expect(result).toContain('## Related Types');
      expect(result).toContain('- Address (`type-address`)');
      expect(result).toContain('- PhoneNumber (`type-phone`)');
    });

    it('should format related endpoints', () => {
      const schema: SchemaDocumentation = {
        ...minimalSchema,
        relatedEndpoints: [
          { id: 'ep-1', name: 'getUser', method: 'GET', path: '/users/{id}' },
          { id: 'ep-2', name: 'createUser', method: 'POST', path: '/users' },
        ],
      };
      const result = formatSchemaDocumentation(schema);

      expect(result).toContain('## Related Endpoints');
      expect(result).toContain('`GET` /users/{id} - getUser');
      expect(result).toContain('`POST` /users - createUser');
    });

    it('should not include empty related sections', () => {
      const result = formatSchemaDocumentation(minimalSchema);

      expect(result).not.toContain('## Related Types');
      expect(result).not.toContain('## Related Endpoints');
    });
  });

  describe('extractEndpointRelatedTypes', () => {
    it('should extract request body type', () => {
      const endpoint: RestDocumentation = {
        id: 'ep-1',
        name: 'createUser',
        method: 'POST',
        path: '/users',
        requestUrl: '',
        variables: [],
        responseExamples: {},
        tabs: [],
        requestBody: { name: 'CreateUserRequest', id: 'type-req' },
      };
      const types = extractEndpointRelatedTypes(endpoint);

      expect(types).toContainEqual({ name: 'CreateUserRequest', id: 'type-req' });
    });

    it('should extract response type', () => {
      const endpoint: RestDocumentation = {
        id: 'ep-1',
        name: 'getUser',
        method: 'GET',
        path: '/users/{id}',
        requestUrl: '',
        variables: [],
        responseExamples: {},
        tabs: [],
        response: { name: 'UserResponse', id: 'type-res' },
      };
      const types = extractEndpointRelatedTypes(endpoint);

      expect(types).toContainEqual({ name: 'UserResponse', id: 'type-res' });
    });

    it('should extract types from variables', () => {
      const endpoint: RestDocumentation = {
        id: 'ep-1',
        name: 'getUser',
        method: 'GET',
        path: '/users/{id}',
        requestUrl: '',
        variables: [
          { name: 'id', in: 'path', ref: '#/string', relatedType: { name: 'UserId', id: 'type-id' } },
        ],
        responseExamples: {},
        tabs: [],
      };
      const types = extractEndpointRelatedTypes(endpoint);

      expect(types).toContainEqual({ name: 'UserId', id: 'type-id' });
    });

    it('should deduplicate types by id', () => {
      const endpoint: RestDocumentation = {
        id: 'ep-1',
        name: 'updateUser',
        method: 'PUT',
        path: '/users/{id}',
        requestUrl: '',
        variables: [],
        responseExamples: {},
        tabs: [],
        requestBody: { name: 'User', id: 'type-user' },
        response: { name: 'User', id: 'type-user' },
      };
      const types = extractEndpointRelatedTypes(endpoint);

      expect(types).toHaveLength(1);
      expect(types[0].id).toBe('type-user');
    });
  });

  describe('createEndpointResult', () => {
    it('should create formatted documentation result', () => {
      const endpoint: RestDocumentation = {
        id: 'endpoint-1',
        name: 'getUser',
        method: 'GET',
        path: '/api/users/{id}',
        requestUrl: 'http://api.example.com/users/{id}',
        variables: [],
        responseExamples: {},
        tabs: [{ name: 'Overview', content: 'Get a user.' }],
      };

      const result = createEndpointResult(endpoint, 'petstore');

      expect(result.id).toBe('endpoint-1');
      expect(result.name).toBe('getUser');
      expect(result.type).toBe('endpoint');
      expect(result.source).toBe('petstore');
      expect(result.method).toBe('GET');
      expect(result.path).toBe('/api/users/{id}');
      expect(result.documentation).toContain('# getUser');
      expect(result.relatedEndpoints).toEqual([]);
    });
  });

  describe('createSchemaResult', () => {
    it('should create formatted documentation result', () => {
      const schema: SchemaDocumentation = {
        id: 'schema-1',
        name: 'User',
        description: 'A user model.',
        jsonSchema: { type: 'object' },
        tabs: [],
        relatedTypes: [{ name: 'Address', id: 'type-addr' }],
        relatedEndpoints: [
          { id: 'ep-1', name: 'getUser', method: 'GET', path: '/users/{id}' },
        ],
      };

      const result = createSchemaResult(schema, 'petstore');

      expect(result.id).toBe('schema-1');
      expect(result.name).toBe('User');
      expect(result.type).toBe('schema');
      expect(result.source).toBe('petstore');
      expect(result.documentation).toContain('# User');
      expect(result.relatedTypes).toContainEqual({ name: 'Address', id: 'type-addr' });
      expect(result.relatedEndpoints).toContainEqual({ name: 'getUser', id: 'ep-1' });
    });
  });
});
