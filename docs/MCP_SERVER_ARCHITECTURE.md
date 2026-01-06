# Intrig MCP Server Architecture

## Overview

The Intrig MCP Server (`intrig-mcp`) is a standalone Model Context Protocol server that exposes Intrig's API documentation and search capabilities to Claude Desktop and MCP-compatible IDEs. It acts as a bridge between LLM clients and one or more running Intrig daemons.

### Purpose

Developers frequently need to:
- Search for API endpoints by name, path, or description
- View hook/function documentation and usage examples
- Understand request/response type structures

Currently this requires context-switching to Insight (browser) or CLI. The MCP server brings this information directly into the LLM conversation.

### Design Principles

- **Read-only**: No mutations to project configuration or generated code
- **Proxy architecture**: MCP server discovers and delegates to daemon REST APIs
- **Auto-start**: If a registered daemon isn't running, start it automatically
- **Global instance**: Single MCP server serves all Intrig projects on the machine

## System Architecture

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

## Discovery Mechanism

### Registry Location

Daemons register themselves in a file-based registry:

```
{os.tmpdir()}/{username}.intrig/
├── {sha1(absolutePath1)}.json
├── {sha1(absolutePath2)}.json
└── {sha1(absolutePath3)}.json
```

Example on Linux: `/tmp/tiran.intrig/a1b2c3d4e5f6...json`

### Metadata File Structure

Each JSON file contains:

```typescript
interface DiscoveryMetadata {
  projectName: string;    // From package.json name, sanitized
  url: string;            // e.g., "http://localhost:5050"
  port: number;           // e.g., 5050
  pid: number;            // Process ID
  timestamp: string;      // ISO date when registered
  path: string;           // Absolute path to project root
  type: string;           // Generator type (react, next, etc.)
}
```

### Discovery Operations

**Scan Registry:**
1. List all `.json` files in `{tmpdir}/{username}.intrig/`
2. Parse each file as `DiscoveryMetadata`
3. Return list of registered projects

**Check Running:**
1. For a given metadata entry, check if `port` is in use via TCP probe
2. Return boolean

**Auto-Start Daemon:**
1. If metadata exists but daemon not running (port check fails)
2. Execute: `cd {metadata.path} && intrig daemon up`
3. Wait for daemon to be ready (poll port or watch for metadata update)
4. Return updated metadata with confirmed running status

### Path Resolution

When resolving a path to a project:
1. Normalize the input path to absolute
2. For each registered project, check if input path equals or is subdirectory of `metadata.path`
3. Return matching project (prefer exact match over subdirectory match)

## Daemon REST API Reference

The MCP server calls these daemon endpoints:

### Search

```
GET /api/data/search
```

Query Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | No | Full-text search query |
| type | "rest" \| "schema" | No | Filter by resource type |
| source | string | No | Filter by API source ID |
| page | number | No | Zero-based page index (default: 0) |
| size | number | No | Page size (default: 10) |

Response:
```typescript
interface SearchResponse {
  data: Array<{
    id: string;
    name: string;
    type: "rest" | "schema";
    source: string;
    description?: string;
    path?: string;      // For endpoints
    method?: string;    // For endpoints
  }>;
  total: number;
  page: number;
  size: number;
}
```

### Get Endpoint Documentation

```
GET /api/data/get/endpoint/{id}
```

Response:
```typescript
interface RestDocumentation {
  id: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  requestBody?: RelatedType;
  contentType?: string;
  response?: RelatedType;
  responseType?: string;
  requestUrl: string;
  variables: Variable[];
  responseExamples?: Record<string, any>;
  tabs: Tab[];
}

interface Tab {
  name: string;
  content: string;  // Markdown
}
```

### Get Schema Documentation

```
GET /api/data/get/schema/{id}
```

Response:
```typescript
interface SchemaDocumentation {
  id: string;
  name: string;
  description?: string;
  jsonSchema: object;
  tabs: Tab[];
  relatedTypes: RelatedType[];
  relatedEndpoints: RelatedEndpoint[];
}
```

### List Sources

```
GET /api/config/sources/list
```

Response:
```typescript
interface SourcesResponse {
  sources: Array<{
    id: string;
    url: string;
    type: string;
  }>;
}
```

## MCP Tool Specifications

### Tool 1: `list_projects`

List all registered Intrig projects and their daemon status.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output:**
```typescript
interface ListProjectsResult {
  projects: Array<{
    projectName: string;
    path: string;
    port: number;
    running: boolean;
    type: string;
  }>;
}
```

**Behavior:**
1. Scan registry directory for all metadata files
2. For each, check if daemon is running (port probe)
3. Return list with status

**Errors:**
- Registry directory doesn't exist → return empty list

---

### Tool 2: `get_project`

Resolve a path to its Intrig project. Auto-starts daemon if not running.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Absolute or relative path to project or subdirectory"
    }
  },
  "required": ["path"]
}
```

**Output:**
```typescript
interface GetProjectResult {
  projectName: string;
  path: string;
  url: string;
  port: number;
  type: string;
  sources: Array<{
    id: string;
    url: string;
    type: string;
  }>;
}
```

**Behavior:**
1. Normalize input path to absolute
2. Find matching project in registry (exact or subdirectory match)
3. If not found → error
4. If found but not running → auto-start daemon, wait for ready
5. Fetch sources from daemon (`GET /api/config/sources/list`)
6. Return project info with sources

**Errors:**
- `PROJECT_NOT_FOUND`: No registered project matches path
- `DAEMON_START_FAILED`: Auto-start attempted but daemon didn't come up
- `DAEMON_UNAVAILABLE`: Daemon running but not responding

---

### Tool 3: `search`

Search for endpoints and schemas across an Intrig project.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project": {
      "type": "string",
      "description": "Project path or projectName"
    },
    "query": {
      "type": "string",
      "description": "Search query. Use specific terms: endpoint names, paths (/api/users), HTTP methods (GET, POST), or type names."
    },
    "type": {
      "type": "string",
      "enum": ["endpoint", "schema"],
      "description": "Filter results by type. Omit to search both."
    },
    "source": {
      "type": "string",
      "description": "Filter by API source ID"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return (default: 15)"
    }
  },
  "required": ["project", "query"]
}
```

**Output:**
```typescript
interface SearchResult {
  results: Array<{
    id: string;
    name: string;
    type: "endpoint" | "schema";
    source: string;
    description?: string;
    path?: string;
    method?: string;
  }>;
  total: number;
  query: string;
}
```

**Behavior:**
1. Resolve project identifier to daemon URL
2. If daemon not running → auto-start
3. Map `type` parameter: "endpoint" → "rest", "schema" → "schema"
4. Call daemon search API
5. Transform response to MCP format

**Errors:**
- `PROJECT_NOT_FOUND`: Project identifier doesn't match any registered project
- `DAEMON_UNAVAILABLE`: Cannot reach daemon

---

### Tool 4: `get_documentation`

Get full documentation for an endpoint or schema.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project": {
      "type": "string",
      "description": "Project path or projectName"
    },
    "type": {
      "type": "string",
      "enum": ["endpoint", "schema"],
      "description": "Resource type"
    },
    "id": {
      "type": "string",
      "description": "Resource ID from search results"
    }
  },
  "required": ["project", "type", "id"]
}
```

**Output:**
```typescript
interface DocumentationResult {
  id: string;
  name: string;
  type: "endpoint" | "schema";
  source: string;
  
  // Endpoint-specific
  method?: string;
  path?: string;
  
  // Formatted documentation (all tabs combined)
  documentation: string;
  
  // For drill-down
  relatedTypes?: Array<{ name: string; id: string }>;
  relatedEndpoints?: Array<{ name: string; id: string }>;
}
```

**Documentation Formatting:**

Combine daemon's `Tab[]` into single markdown document:

```markdown
# {name}

**Source:** {source}
**Method:** {method}
**Path:** {path}

## {tab1.name}

{tab1.content}

## {tab2.name}

{tab2.content}

...
```

For schemas, include JSON schema summary and related items.

**Behavior:**
1. Resolve project to daemon URL
2. Call appropriate endpoint based on type:
   - endpoint → `GET /api/data/get/endpoint/{id}`
   - schema → `GET /api/data/get/schema/{id}`
3. Format documentation as markdown
4. Extract related types/endpoints for drill-down

**Errors:**
- `PROJECT_NOT_FOUND`: Project identifier doesn't match
- `RESOURCE_NOT_FOUND`: ID doesn't exist in daemon
- `DAEMON_UNAVAILABLE`: Cannot reach daemon

## Error Handling Strategy

### Error Response Format

All tools return errors in MCP's standard format:

```typescript
{
  isError: true,
  content: [{
    type: "text",
    text: "Error message for user"
  }]
}
```

### Error Codes

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| `PROJECT_NOT_FOUND` | 404 | No project matches identifier |
| `RESOURCE_NOT_FOUND` | 404 | Endpoint/schema ID not found |
| `DAEMON_UNAVAILABLE` | 503 | Daemon not responding |
| `DAEMON_START_FAILED` | 500 | Auto-start attempted but failed |
| `INVALID_INPUT` | 400 | Malformed tool input |

### Retry Strategy

- Daemon requests: 2 retries with 500ms delay
- Auto-start: Wait up to 10 seconds for daemon ready
- Port check: 100ms timeout

## Technical Constraints

### Runtime
- Node.js 18+
- TypeScript strict mode
- ES modules

### Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `tcp-port-used` - Port availability checking
- Standard Node.js modules (fs, path, os, crypto, http)

### Transport
- stdio only (Claude Desktop requirement)
- No HTTP/SSE server mode required

### Concurrency
- Single-threaded (Node.js event loop)
- Multiple concurrent tool calls supported
- Daemon HTTP calls are non-blocking

## Project Structure

```
app/intrig-mcp/
├── src/
│   ├── main.ts                    # Entry point, starts MCP server
│   ├── mcp/
│   │   ├── server.ts              # MCP server setup
│   │   └── tools/
│   │       ├── list-projects.ts
│   │       ├── get-project.ts
│   │       ├── search.ts
│   │       └── get-documentation.ts
│   ├── services/
│   │   ├── discovery.service.ts   # Registry scanning, auto-start
│   │   └── daemon-client.ts       # HTTP client for daemon API
│   ├── formatters/
│   │   └── documentation.ts       # Tab[] → markdown
│   └── types/
│       ├── discovery.ts           # DiscoveryMetadata, etc.
│       ├── daemon-api.ts          # Daemon response types
│       └── tools.ts               # Tool input/output types
├── project.json                   # Nx project configuration
├── tsconfig.json
├── tsconfig.app.json
└── README.md
```

## Claude Desktop Configuration

End users configure Claude Desktop to use the MCP server:

```json
{
  "mcpServers": {
    "intrig": {
      "command": "npx",
      "args": ["@intrig/mcp"],
      "env": {}
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "intrig": {
      "command": "intrig-mcp"
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Discovery service: mock filesystem
- Daemon client: mock HTTP responses
- Documentation formatter: snapshot tests

### Integration Tests
- Start real daemon, verify tool responses
- Auto-start scenario: stop daemon, call tool, verify restart

### Manual Testing
- Claude Desktop connection
- Multi-project scenario
- Error scenarios (daemon down, invalid paths)
