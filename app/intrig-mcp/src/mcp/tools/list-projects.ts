/**
 * list_projects tool - List all registered Intrig projects and their daemon status.
 */

import { listProjects } from '../../services/discovery.service.js';
import { formatNoProjectsMessage } from '../../utils/errors.js';
import { createDebugger } from '../../utils/logger.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const debug = createDebugger('tools:list-projects');

/**
 * Tool schema for list_projects.
 */
export const listProjectsTool: Tool = {
  name: 'list_projects',
  description:
    'List all registered Intrig projects and their daemon status. Use this to discover available projects before searching or getting documentation.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

/**
 * Handle list_projects tool call.
 */
export async function handleListProjects(): Promise<CallToolResult> {
  debug('Listing projects');

  const projects = await listProjects();

  debug(`Found ${projects.length} project(s)`);

  if (projects.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: formatNoProjectsMessage(),
        },
      ],
    };
  }

  // Format projects as a readable list
  const lines: string[] = [];
  lines.push(`Found ${projects.length} registered Intrig project(s):\n`);

  for (const project of projects) {
    const status = project.running ? 'running' : 'stopped';
    lines.push(`**${project.projectName}** [${status}]`);
    lines.push(`  - Path: ${project.path}`);
    lines.push(`  - Port: ${project.port}`);
    lines.push(`  - Type: ${project.type}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Use `get_project` with a path to see API sources, or `search` to find endpoints and schemas.');

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n').trim(),
      },
    ],
  };
}
