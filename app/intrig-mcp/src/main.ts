#!/usr/bin/env node
/**
 * Intrig MCP Server
 *
 * A Model Context Protocol server that exposes Intrig's API documentation
 * and search capabilities to Claude Desktop and MCP-compatible IDEs.
 */

import { startServer } from './mcp/server.js';

/**
 * Main entry point.
 * Starts the MCP server and sets up graceful shutdown.
 */
async function main(): Promise<void> {
  // Set up graceful shutdown handlers
  const shutdown = () => {
    console.error('Intrig MCP server shutting down');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the MCP server
  await startServer();
}

main().catch((error) => {
  // Log errors to stderr (stdout is reserved for MCP protocol)
  console.error('Fatal error:', error);
  process.exit(1);
});
