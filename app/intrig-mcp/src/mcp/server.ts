/**
 * MCP Server setup for Intrig.
 * Configures stdio transport and registers all tools.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { listProjectsTool, handleListProjects } from './tools/list-projects.js';
import { getProjectTool, handleGetProject } from './tools/get-project.js';
import { searchTool, handleSearch } from './tools/search.js';
import { getDocumentationTool, handleGetDocumentation } from './tools/get-documentation.js';

/**
 * All registered tools with their schemas.
 */
const TOOLS = [
  listProjectsTool,
  getProjectTool,
  searchTool,
  getDocumentationTool,
];

/**
 * Create and configure the MCP server.
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'intrig-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_projects':
          return await handleListProjects();

        case 'get_project':
          return await handleGetProject(args as { path: string });

        case 'search':
          return await handleSearch(
            args as {
              project: string;
              query: string;
              type?: 'endpoint' | 'schema';
              source?: string;
              limit?: number;
            }
          );

        case 'get_documentation':
          return await handleGetDocumentation(
            args as {
              project: string;
              type: 'endpoint' | 'schema';
              id: string;
            }
          );

        default:
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Unknown tool: ${name}`,
              },
            ],
          };
      }
    } catch (error) {
      // Handle unexpected errors
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Internal error: ${message}`,
          },
        ],
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log startup to stderr (stdout is reserved for MCP protocol)
  console.error('Intrig MCP server started');
}
