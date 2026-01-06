/**
 * get_documentation tool - Get full documentation for an endpoint or schema.
 * For endpoints, inlines request/response type definitions to avoid drill-down.
 */

import { getProjectByIdentifier } from '../../services/discovery.service.js';
import {
  getEndpointDocumentation,
  getSchemaDocumentation,
} from '../../services/daemon-client.js';
import {
  createEndpointResult,
  createEndpointResultWithSchemas,
  createSchemaResult,
} from '../../formatters/documentation.js';
import { formatError, formatValidationError } from '../../utils/errors.js';
import { createDebugger } from '../../utils/logger.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SchemaDocumentation, RelatedType } from '../../types/daemon-api.js';

const debug = createDebugger('tools:get-documentation');

/**
 * Tool schema for get_documentation.
 */
export const getDocumentationTool: Tool = {
  name: 'get_documentation',
  description:
    'Get full documentation for an API endpoint or schema. Use IDs from search results. Returns formatted markdown documentation including request/response types with INLINED TypeScript definitions, examples, and related resources for drill-down.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project path or projectName',
      },
      type: {
        type: 'string',
        enum: ['endpoint', 'schema'],
        description: 'Resource type',
      },
      id: {
        type: 'string',
        description: 'Resource ID from search results',
      },
    },
    required: ['project', 'type', 'id'],
  },
};

/**
 * Input type for get_documentation.
 */
interface GetDocumentationInput {
  project: string;
  type: 'endpoint' | 'schema';
  id: string;
}

/**
 * Fetch schemas for endpoint's request body and response types in parallel.
 * Also fetches nested related types from the response schema (1 level deep).
 */
async function fetchEndpointSchemas(
  daemonUrl: string,
  requestBody?: RelatedType,
  response?: RelatedType
): Promise<Map<string, SchemaDocumentation>> {
  const schemas = new Map<string, SchemaDocumentation>();
  const schemaIdsToFetch: string[] = [];

  // Collect schema IDs to fetch
  if (requestBody) {
    schemaIdsToFetch.push(requestBody.id);
  }
  if (response) {
    schemaIdsToFetch.push(response.id);
  }

  if (schemaIdsToFetch.length === 0) {
    return schemas;
  }

  // Fetch request body and response schemas in parallel
  debug('Fetching schemas for endpoint:', schemaIdsToFetch);
  const results = await Promise.allSettled(
    schemaIdsToFetch.map((id) => getSchemaDocumentation(daemonUrl, id))
  );

  // Process results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const id = schemaIdsToFetch[i];

    if (result.status === 'fulfilled' && result.value.ok) {
      schemas.set(id, result.value.value);
    } else {
      debug('Failed to fetch schema:', id);
    }
  }

  // Fetch nested types from response schema (1 level deep, limit to 5)
  if (response && schemas.has(response.id)) {
    const responseSchema = schemas.get(response.id)!;
    const nestedIds = responseSchema.relatedTypes
      .slice(0, 5)
      .filter((t) => !schemas.has(t.id))
      .map((t) => t.id);

    if (nestedIds.length > 0) {
      debug('Fetching nested schemas:', nestedIds);
      const nestedResults = await Promise.allSettled(
        nestedIds.map((id) => getSchemaDocumentation(daemonUrl, id))
      );

      for (let i = 0; i < nestedResults.length; i++) {
        const result = nestedResults[i];
        const id = nestedIds[i];

        if (result.status === 'fulfilled' && result.value.ok) {
          schemas.set(id, result.value.value);
        }
      }
    }
  }

  debug('Fetched', schemas.size, 'schemas for inlining');
  return schemas;
}

/**
 * Handle get_documentation tool call.
 */
export async function handleGetDocumentation(
  input: GetDocumentationInput
): Promise<CallToolResult> {
  debug('Getting documentation:', input);

  // Validate input
  if (!input.project || typeof input.project !== 'string') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatValidationError('project', 'is required and must be a string'),
        },
      ],
    };
  }

  if (!input.type || (input.type !== 'endpoint' && input.type !== 'schema')) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatValidationError('type', 'must be either "endpoint" or "schema"'),
        },
      ],
    };
  }

  if (!input.id || typeof input.id !== 'string') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatValidationError('id', 'is required and must be a string'),
        },
      ],
    };
  }

  // Resolve project to daemon URL
  const projectResult = await getProjectByIdentifier(input.project);

  if (!projectResult.ok) {
    const error = projectResult.error;
    debug('Project lookup failed:', error.code, error.message);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatError(error.code, error.message),
        },
      ],
    };
  }

  const project = projectResult.value;
  debug('Found project:', project.projectName);

  // Fetch documentation based on type
  if (input.type === 'endpoint') {
    const docResult = await getEndpointDocumentation(project.url, input.id);

    if (!docResult.ok) {
      const error = docResult.error;
      debug('Endpoint documentation fetch failed:', error.code, error.message);

      // Provide helpful message for not found errors
      if (error.code === 'RESOURCE_NOT_FOUND') {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                `Endpoint not found: "${input.id}"\n\n` +
                'The ID may be invalid or the endpoint may have been removed.\n' +
                'Use `search` to find current endpoint IDs.',
            },
          ],
        };
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: formatError(error.code, error.message),
          },
        ],
      };
    }

    const endpointDoc = docResult.value;
    debug('Got endpoint documentation:', endpointDoc.name);

    // Fetch schemas for request body and response types
    const schemas = await fetchEndpointSchemas(
      project.url,
      endpointDoc.requestBody,
      endpointDoc.response
    );

    // Use the enhanced formatter with inlined schemas
    const formatted =
      schemas.size > 0
        ? createEndpointResultWithSchemas(endpointDoc, schemas)
        : createEndpointResult(endpointDoc);

    // Build response with documentation and remaining related items
    const lines: string[] = [];
    lines.push(formatted.documentation);

    if (formatted.relatedTypes.length > 0) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('**Additional Related Types** (use `get_documentation` with type="schema"):');
      for (const rt of formatted.relatedTypes) {
        lines.push(`- ${rt.name}: \`${rt.id}\``);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
      ],
    };
  } else {
    // Schema
    const docResult = await getSchemaDocumentation(project.url, input.id);

    if (!docResult.ok) {
      const error = docResult.error;
      debug('Schema documentation fetch failed:', error.code, error.message);

      // Provide helpful message for not found errors
      if (error.code === 'RESOURCE_NOT_FOUND') {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                `Schema not found: "${input.id}"\n\n` +
                'The ID may be invalid or the schema may have been removed.\n' +
                'Use `search` with type="schema" to find current schema IDs.',
            },
          ],
        };
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: formatError(error.code, error.message),
          },
        ],
      };
    }

    debug('Got schema documentation:', docResult.value.name);
    const formatted = createSchemaResult(docResult.value);

    // Build response with documentation and related items
    const lines: string[] = [];
    lines.push(formatted.documentation);

    // Add drill-down hints
    const hasRelated =
      formatted.relatedTypes.length > 0 || formatted.relatedEndpoints.length > 0;

    if (hasRelated) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('**Drill-down** (use `get_documentation` with appropriate type):');

      if (formatted.relatedTypes.length > 0) {
        lines.push('');
        lines.push('Related Types (type="schema"):');
        for (const rt of formatted.relatedTypes) {
          lines.push(`- ${rt.name}: \`${rt.id}\``);
        }
      }

      if (formatted.relatedEndpoints.length > 0) {
        lines.push('');
        lines.push('Related Endpoints (type="endpoint"):');
        for (const re of formatted.relatedEndpoints) {
          lines.push(`- ${re.name}: \`${re.id}\``);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
      ],
    };
  }
}
