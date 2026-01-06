# @intrig/mcp

MCP (Model Context Protocol) server for [Intrig](https://intrig.io) - exposes API documentation and search capabilities to Claude Desktop and MCP-compatible IDEs.

## Overview

The Intrig MCP server acts as a bridge between LLM clients (like Claude Desktop) and your Intrig-powered projects. It allows you to:

- **Search** for API endpoints and schemas by name, path, or description
- **View documentation** for hooks, functions, and type structures
- **Explore** request/response types and related resources

All without leaving your conversation with Claude.

## Installation

### Using npx (Recommended)

No installation required - configure Claude Desktop to run via npx:

```json
{
  "mcpServers": {
    "intrig": {
      "command": "npx",
      "args": ["@intrig/mcp"]
    }
  }
}
```

### Global Installation

```bash
npm install -g @intrig/mcp
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "intrig": {
      "command": "intrig-mcp"
    }
  }
}
```

## Claude Desktop Setup

1. Open Claude Desktop settings
2. Navigate to the MCP servers configuration
3. Add the Intrig MCP server configuration (see above)
4. Restart Claude Desktop

The configuration file is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Prerequisites

Before using the MCP server, ensure you have:

1. An Intrig project initialized (`intrig init`)
2. API sources configured in your `intrig.config.js`
3. The Intrig daemon running (`intrig daemon up`)

The MCP server will automatically discover running Intrig daemons on your machine.

## Available Tools

### `list_projects`

List all registered Intrig projects and their daemon status.

**Example prompt:**
> "What Intrig projects are available?"

**Response includes:**
- Project name and path
- Daemon status (running/stopped)
- Port number
- Project type (react, next, etc.)

---

### `get_project`

Get detailed information about a specific project, including API sources.

**Parameters:**
- `path` (required): Absolute or relative path to the project

**Example prompt:**
> "Show me the details of the project at /home/user/my-app"

**Response includes:**
- Project configuration
- List of API sources with their spec URLs
- Daemon status

---

### `search`

Search for API endpoints and schemas in a project.

**Parameters:**
- `project` (required): Project path or name
- `query` (required): Search terms (endpoint names, paths, HTTP methods, type names)
- `type` (optional): Filter by "endpoint" or "schema"
- `source` (optional): Filter by API source ID
- `limit` (optional): Maximum results (default: 15)

**Example prompts:**
> "Search for user endpoints in my-app"
> "Find all POST endpoints related to authentication"
> "Search for the UserProfile schema"

**Tips:**
- Use specific terms: endpoint names, paths (`/api/users`), HTTP methods (`GET`, `POST`)
- This is keyword search, not semantic search

---

### `get_documentation`

Get full documentation for an endpoint or schema.

**Parameters:**
- `project` (required): Project path or name
- `type` (required): "endpoint" or "schema"
- `id` (required): Resource ID from search results

**Example prompt:**
> "Show me the documentation for endpoint abc123"

**Response includes:**
- Full markdown documentation
- Request/response types
- Related types and endpoints for drill-down

## Debug Logging

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=intrig-mcp npx @intrig/mcp
```

For more verbose output:

```bash
DEBUG=intrig-mcp:* npx @intrig/mcp
```

Debug logs are written to stderr and won't interfere with the MCP protocol.

## Troubleshooting

### "No registered Intrig projects found"

The MCP server discovers projects by scanning for running Intrig daemons. To register a project:

1. Navigate to your project directory
2. Run `intrig init` if you haven't already
3. Run `intrig daemon up` to start the daemon

### "Project not found"

Ensure the path you're using is correct and the daemon is running:

```bash
cd /path/to/your/project
intrig daemon up
```

### "Daemon unavailable"

The daemon may have stopped. Restart it:

```bash
intrig daemon up
```

Or check if it's running:

```bash
intrig daemon status
```

### "No API sources configured"

Add API sources to your `intrig.config.js`:

```javascript
export default {
  sources: [
    {
      id: "my-api",
      specUrl: "https://api.example.com/openapi.json"
    }
  ]
};
```

Then sync the specifications:

```bash
intrig sync
```

### Search returns no results

- Try different keywords (endpoint names, paths, type names)
- Remove type filters to search both endpoints and schemas
- Use partial matches (e.g., "user" instead of "getUserById")

## Related

- [Intrig Documentation](https://intrig.io/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/desktop)

## License

MIT
