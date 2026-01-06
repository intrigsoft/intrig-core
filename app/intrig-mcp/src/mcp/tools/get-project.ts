/**
 * get_project tool - Resolve a path to its Intrig project with sources.
 * Auto-starts daemon if not running.
 */

import { getProject } from '../../services/discovery.service.js';
import { listSources } from '../../services/daemon-client.js';
import {
  formatError,
  formatValidationError,
  formatNoSourcesMessage,
} from '../../utils/errors.js';
import { createDebugger } from '../../utils/logger.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const debug = createDebugger('tools:get-project');

/**
 * Tool schema for get_project.
 */
export const getProjectTool: Tool = {
  name: 'get_project',
  description:
    'Resolve a path to its Intrig project and list API sources. Auto-starts the daemon if not running. Use this to get project details and available API sources before searching.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to project or subdirectory',
      },
    },
    required: ['path'],
  },
};

/**
 * Input type for get_project.
 */
interface GetProjectInput {
  path: string;
}

/**
 * Handle get_project tool call.
 */
export async function handleGetProject(input: GetProjectInput): Promise<CallToolResult> {
  debug('Getting project for path:', input.path);

  // Validate input
  if (!input.path || typeof input.path !== 'string') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: formatValidationError('path', 'is required and must be a string'),
        },
      ],
    };
  }

  // Get project info (auto-starts daemon if needed)
  const projectResult = await getProject(input.path);

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

  // Fetch sources from daemon
  const sourcesResult = await listSources(project.url);

  const lines: string[] = [];
  lines.push(`# ${project.projectName}`);
  lines.push('');
  lines.push(`**Path:** ${project.path}`);
  lines.push(`**URL:** ${project.url}`);
  lines.push(`**Port:** ${project.port}`);
  lines.push(`**Type:** ${project.type}`);
  lines.push(`**Status:** Running`);

  if (sourcesResult.ok) {
    const sources = sourcesResult.value;
    debug(`Found ${sources.length} source(s)`);

    if (sources.length > 0) {
      lines.push('');
      lines.push('## API Sources');
      lines.push('');
      for (const source of sources) {
        lines.push(`- **${source.name}** (\`${source.id}\`)`);
        lines.push(`  - Spec URL: ${source.specUrl}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('Use `search` with the project path and a query to find endpoints and schemas.');
    } else {
      lines.push('');
      lines.push(formatNoSourcesMessage(project.projectName));
    }
  } else {
    debug('Failed to fetch sources:', sourcesResult.error.message);
    lines.push('');
    lines.push(`**Note:** Could not fetch API sources: ${sourcesResult.error.message}`);
    lines.push('The daemon is running, but sources may not be synced yet.');
    lines.push('Run `intrig sync` in the project directory to sync API specifications.');
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
