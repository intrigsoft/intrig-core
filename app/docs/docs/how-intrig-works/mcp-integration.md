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
- **MCP client compatibility**: Works with any MCP-compatible client including Claude Desktop, Claude Code, Cursor, and other IDE integrations supporting the Model Context Protocol

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

## Configuration

Configure your MCP client to use the Intrig MCP server.

**Using npx (recommended)**:
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

Refer to your MCP client's documentation for configuration file location and restart requirements.

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

## Scope and Limitations

The MCP server provides read-only access to API documentation derived from OpenAPI specifications. Understanding its scope helps set appropriate expectations.

### What MCP Provides

- Endpoint discovery by name, path, HTTP method
- Schema exploration with full type definitions
- Generated code examples for each endpoint
- Cross-referencing between related types and endpoints
- Multi-project and multi-source navigation

### What MCP Does Not Provide

- **Runtime information**: No access to actual API responses, logs, or metrics
- **Code modification**: Cannot create, edit, or delete files in your project
- **Specification editing**: Cannot modify OpenAPI specs or Intrig configuration
- **Test execution**: Cannot invoke endpoints or validate responses
- **Full-text search on descriptions**: Search targets identifiers (names, paths, types), not prose descriptions
- **Semantic search**: Keyword matching, not natural language understanding of intent

### Search Behavior

Search uses keyword matching against:
- Endpoint operation IDs and paths
- HTTP methods
- Schema names
- Parameter names

For best results, use specific terms that appear in the OpenAPI specification. Generic queries like "get data" may return limited results compared to specific queries like "getEmployee" or "/api/users".

### Large API Surfaces

For APIs with hundreds of endpoints, search results are limited (default: 15). Use source filters and specific queries to narrow results. Multiple searches may be needed to fully explore a large API.

---

## Developer Workflows

The MCP server supports common development scenarios where API discovery accelerates implementation.

### Implementing a New Feature

You're building an employee management form and need to understand the available API operations.

**Step 1: Discover the API structure**
> "What API sources are available in this project?"

Claude lists configured sources (e.g., `employee_api`, `auth_api`).

**Step 2: Find relevant endpoints**
> "Search for employee endpoints in employee_api"

Claude returns matching endpoints: `getEmployee`, `createEmployee`, `updateEmployee`, `deleteEmployee`.

**Step 3: Get implementation details**
> "Show me the createEmployee endpoint documentation"

Claude provides:
- HTTP method and path
- Request body schema with all fields and types
- Response schema
- Generated hook code example
- Related types for imports

**Step 4: Understand validation**
> "What fields are required for creating an employee?"

Claude references the schema to identify required vs optional fields and their constraints.

### Understanding Error Responses

When implementing error handling, you need to know what errors an endpoint can return.

> "What error responses can createEmployee return?"

Claude retrieves the endpoint documentation including error response schemas defined in the OpenAPI spec.

### Exploring Type Definitions

When working with complex nested types:

> "Show me the Employee schema"

Claude returns the full type definition with all properties, nested types inlined for immediate understanding.

> "What types reference Employee?"

Claude searches for schemas that include Employee, revealing related types like `EmployeeListResponse` or `CreateEmployeeRequest`.

### Working with Multiple API Sources

For projects integrating multiple backends:

> "Search for authentication endpoints across all sources"

Claude searches all API sources, indicating which source each result belongs to.

> "Show me the login endpoint from auth_api"

Claude retrieves documentation scoped to the specific source.

### Discovering Available Operations

When joining a project or exploring an unfamiliar API:

> "What operations are available for orders?"

Claude searches endpoints and schemas, providing an overview of the order-related API surface.

> "Show me all POST endpoints in the payments source"

Claude filters search results by HTTP method and source.

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
