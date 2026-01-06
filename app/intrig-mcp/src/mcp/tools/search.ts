/**
 * search tool - Search for endpoints and schemas across an Intrig project.
 */

import { getProjectByIdentifier } from '../../services/discovery.service.js';
import { searchSimple } from '../../services/daemon-client.js';
import { formatError, formatValidationError } from '../../utils/errors.js';
import { createDebugger } from '../../utils/logger.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const debug = createDebugger('tools:search');

/**
 * Tool schema for search.
 */
export const searchTool: Tool = {
  name: 'search',
  description:
    'Search for API endpoints and schemas in an Intrig project. Uses keyword matching (not semantic search). Use specific terms: endpoint names, paths (/api/users), HTTP methods (GET, POST), or type names. Returns IDs that can be used with get_documentation.',
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project path or projectName',
      },
      query: {
        type: 'string',
        description:
          'Search query. Use specific terms: endpoint names, paths (/api/users), HTTP methods (GET, POST), or type names.',
      },
      type: {
        type: 'string',
        enum: ['endpoint', 'schema'],
        description: 'Filter results by type. Omit to search both.',
      },
      source: {
        type: 'string',
        description: 'Filter by API source ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 15)',
      },
    },
    required: ['project', 'query'],
  },
};

/**
 * Input type for search.
 */
interface SearchInput {
  project: string;
  query: string;
  type?: 'endpoint' | 'schema';
  source?: string;
  limit?: number;
}

/**
 * Handle search tool call.
 */
export async function handleSearch(input: SearchInput): Promise<CallToolResult> {
  debug('Searching:', input);

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

  if (!input.query || typeof input.query !== 'string') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatValidationError('query', 'is required and must be a string'),
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
  debug('Searching in project:', project.projectName);

  // Perform search
  const searchResult = await searchSimple(
    project.url,
    input.query,
    input.type,
    input.source,
    input.limit ?? 15
  );

  if (!searchResult.ok) {
    const error = searchResult.error;
    debug('Search failed:', error.code, error.message);
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

  const response = searchResult.value;
  debug(`Found ${response.total} result(s)`);

  if (response.data.length === 0) {
    const typeHint = input.type ? ` of type "${input.type}"` : '';
    return {
      content: [
        {
          type: 'text',
          text:
            `No results found for "${input.query}"${typeHint} in project ${project.projectName}.\n\n` +
            'Tips for better search results:\n' +
            '- Try different keywords (endpoint names, paths like /api/users, or type names)\n' +
            '- Remove the type filter to search both endpoints and schemas\n' +
            '- Use partial matches (e.g., "user" instead of "getUserById")',
        },
      ],
    };
  }

  // Format results
  const lines: string[] = [];
  lines.push(`Found ${response.total} result(s) for "${input.query}" in **${project.projectName}**:`);
  lines.push('');

  for (const item of response.data) {
    // Map 'rest' back to 'endpoint' for user-facing output
    const displayType = item.type === 'rest' ? 'endpoint' : item.type;

    if (item.type === 'rest') {
      // Endpoint
      lines.push(`**[${displayType}]** \`${item.method ?? 'GET'}\` ${item.path ?? item.name}`);
      lines.push(`  - Name: ${item.name}`);
      lines.push(`  - ID: \`${item.id}\``);
      lines.push(`  - Source: ${item.source}`);
      if (item.description) {
        lines.push(`  - ${item.description}`);
      }
    } else {
      // Schema
      lines.push(`**[${displayType}]** ${item.name}`);
      lines.push(`  - ID: \`${item.id}\``);
      lines.push(`  - Source: ${item.source}`);
      if (item.description) {
        lines.push(`  - ${item.description}`);
      }
    }
    lines.push('');
  }

  if (response.total > response.data.length) {
    lines.push(`*Showing ${response.data.length} of ${response.total} results. Refine your query or increase the limit for more results.*`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Use `get_documentation` with the ID and type to view full documentation.');

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n').trim(),
      },
    ],
  };
}
