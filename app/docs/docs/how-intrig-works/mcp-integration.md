# MCP Integration

Model Context Protocol server for AI-assisted development. The Intrig MCP server exposes API documentation and search capabilities to Claude Desktop and MCP-compatible IDEs, enabling direct access to endpoint documentation within the development conversation.

---

## Overview

The Intrig MCP server (`@intrig/mcp`) is a standalone process that bridges MCP clients (Claude Desktop, compatible IDEs) with running Intrig daemons. It discovers registered projects, proxies documentation requests to the appropriate daemon, and returns formatted documentation suitable for LLM consumption.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ intrig-mcp (standalone process)                                  │
│                                                                  │
│ ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│ │ Discovery       │  │ Daemon Client   │  │ MCP Server       │  │
│ │ Service         │  │                 │  │                  │  │
│ │                 │  │ - search()      │  │ - stdio transport│  │
│ │ - scanRegistry()│  │ - getEndpoint() │  │ - tool handlers  │  │
│ │ - isRunning()   │  │ - getSchema()   │  │ - error handling │  │
│ │ - startDaemon() │  │ - listSources() │  │                  │  │
│ └─────────────────┘  └─────────────────┘  └──────────────────┘  │
│          │                   │                     │             │
│          └───────────────────┴─────────────────────┘             │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTP (REST)
                               ▼
        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
        │ Daemon (:5050)  │  │ Daemon (:5051)  │  │ Daemon (:5052)  │
        │ project-a       │  │ project-b       │  │ project-c       │
        └─────────────────┘  └─────────────────┘  └─────────────────┘
```

Key properties:

- **Read-only**: No mutations to project configuration or generated code
- **Proxy architecture**: Discovers and delegates to daemon REST APIs
- **Auto-start**: Automatically starts daemons when needed
- **Global instance**: Single MCP server serves all Intrig projects on the machine

---

## Installation

The MCP server is distributed as a standalone npm package.

**Via npx (recommended)**:
```bash
npx @intrig/mcp
```

**Global installation**:
```bash
npm install -g @intrig/mcp
```

After global installation, the `intrig-mcp` command becomes available.

---

## Claude Desktop Configuration

Configure Claude Desktop to use the Intrig MCP server by editing the Claude configuration file.

**Configuration file location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Using npx**:
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

**Using global installation**:
```json
{
  "mcpServers": {
    "intrig": {
      "command": "intrig-mcp"
    }
  }
}
```

Restart Claude Desktop after modifying the configuration.

---

## Available Tools

The MCP server exposes four tools for querying API documentation.

### list_projects

Lists all registered Intrig projects and their daemon status.

**Parameters**: None

**Returns**: Project list with name, path, port, running status, and framework type.

**Use case**: Discovering available projects before querying documentation.

**Example output**:
```json
{
  "projects": [
    {
      "projectName": "my-react-app",
      "path": "/home/user/projects/my-react-app",
      "port": 5050,
      "running": true,
      "type": "react"
    }
  ]
}
```

### get_project

Resolves a path to its Intrig project and returns project details including configured API sources.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Absolute or relative path to project or subdirectory |

**Returns**: Project details including name, path, URL, port, type, and configured API sources.

**Behavior**: If the daemon is not running, it starts automatically and waits for readiness.

**Use case**: Obtaining project configuration and available API sources before searching.

### search

Searches for endpoints and schemas across an Intrig project.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project | string | Yes | Project path or project name |
| query | string | Yes | Search query (endpoint names, paths, HTTP methods, type names) |
| type | "endpoint" \| "schema" | No | Filter results by type |
| source | string | No | Filter by API source ID |
| limit | number | No | Maximum results (default: 15) |

**Returns**: Matching endpoints and schemas with ID, name, type, source, and brief description.

**Use case**: Finding relevant endpoints when implementing features.

**Query patterns**:
- Endpoint names: `getUser`, `createOrder`
- Paths: `/api/users`, `/orders/{id}`
- HTTP methods: `GET`, `POST`
- Type names: `UserResponse`, `OrderRequest`

### get_documentation

Retrieves full documentation for an endpoint or schema, including inlined type definitions.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project | string | Yes | Project path or project name |
| type | "endpoint" \| "schema" | Yes | Resource type |
| id | string | Yes | Resource ID from search results |

**Returns**: Complete documentation with:
- Method, path, and description (for endpoints)
- Request and response type definitions (inlined)
- Generated code examples
- Related types and endpoints for further exploration

**Use case**: Obtaining complete implementation details for a specific endpoint.

---

## Usage Examples

### Discovering Available APIs

Query Claude with:
> "What Intrig projects are available on this machine?"

Claude uses `list_projects` to return all registered projects and their status.

### Finding Endpoints

Query Claude with:
> "Search for user-related endpoints in my-react-app"

Claude uses `search` with `query: "user"` to find matching endpoints and schemas.

### Getting Implementation Details

Query Claude with:
> "Show me the documentation for the createUser endpoint"

Claude uses `get_documentation` to retrieve complete endpoint documentation including request/response types and generated hook examples.

### Multi-Source Projects

For projects with multiple API sources:
> "Search for authentication endpoints in the auth-api source"

Claude uses `search` with `source: "auth-api"` to filter results to a specific backend.

---

## Multi-Project Support

The MCP server discovers all Intrig projects registered on the machine through a file-based registry.

### Discovery Mechanism

Daemons register themselves in a temporary directory:
```
{os.tmpdir()}/{username}.intrig/
├── {sha1(project-a-path)}.json
├── {sha1(project-b-path)}.json
└── {sha1(project-c-path)}.json
```

Each registration file contains:
- Project name and path
- Daemon URL and port
- Process ID
- Framework type (react, next)

### Addressing Projects

Tools accept project identifiers in two formats:

1. **Project name**: `my-react-app`
2. **Project path**: `/home/user/projects/my-react-app`

Path resolution supports subdirectories. A path like `/home/user/projects/my-react-app/src/components` resolves to the project at `/home/user/projects/my-react-app`.

### Concurrent Daemons

Multiple daemons run simultaneously on different ports. The MCP server routes requests to the appropriate daemon based on project identifier.

---

## Troubleshooting

### Project Not Found

**Symptom**: Tool returns `PROJECT_NOT_FOUND` error

**Cause**: Project has not run `intrig daemon up` or registration file is stale

**Resolution**:
```bash
# Navigate to project directory
cd /path/to/project

# Start daemon to register project
intrig daemon up
```

### Daemon Not Responding

**Symptom**: Tool returns `DAEMON_UNAVAILABLE` error

**Cause**: Daemon process crashed or port is blocked

**Resolution**:
```bash
# Check daemon status
intrig daemon status

# Restart daemon
intrig daemon restart

# If port conflict exists
intrig insight --port 5051
```

### Stale Registration

**Symptom**: `list_projects` shows project but tools fail

**Cause**: Registration file exists but daemon process terminated unexpectedly

**Resolution**:
```bash
# Restart daemon to refresh registration
intrig daemon restart
```

### Auto-Start Timeout

**Symptom**: Tool returns `DAEMON_START_FAILED` error

**Cause**: Daemon failed to start within 10-second timeout

**Resolution**:
```bash
# Start daemon manually and check for errors
intrig daemon up

# Review daemon logs
intrig daemon logs
```

### Empty Search Results

**Symptom**: Search returns no results for known endpoints

**Cause**: Specifications not synchronized or daemon index is stale

**Resolution**:
```bash
# Sync specifications
intrig sync --all

# Restart daemon to reindex
intrig daemon restart
```

---

## Related Documentation

- [Daemon and Insight](./daemon-insight.md) - Background service management
- [CLI Reference](../cli-reference.mdx) - Complete command documentation
- [Synchronization](./synchronization.md) - Keeping specifications current
