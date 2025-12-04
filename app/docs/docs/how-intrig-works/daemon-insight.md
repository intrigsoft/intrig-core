# Daemon and Insight

Background service management and searchable API documentation interface. The Intrig daemon provides runtime support for development tools, with Insight offering an interactive web interface for exploring generated SDKs and API endpoints.

---

## Daemon Architecture

The Intrig daemon is a background Node.js process that:

- Maintains indexed representation of synchronized API specifications
- Serves the Insight web interface
- Provides real-time documentation lookup
- Manages cache and state for development tools

The daemon runs locally and does not require network access beyond serving the web interface.

---

## Daemon Lifecycle

### Starting the Daemon

```bash
intrig daemon up
```

Starts the daemon process in the background. The daemon:
- Initializes on port 5050 (configurable)
- Indexes all synchronized specifications
- Remains active until explicitly stopped
- Persists across terminal sessions

**Verification**:
```bash
intrig daemon status
```

### Stopping the Daemon

```bash
intrig daemon down
```

Gracefully shuts down the daemon process. Active Insight sessions will disconnect.

### Restarting the Daemon

```bash
intrig daemon restart
```

Stops and restarts the daemon. Required when:
- Specifications have been resynchronized
- Configuration changes require reload
- Daemon process becomes unresponsive

---

## Insight Tool

Insight provides searchable documentation for generated SDKs through a web interface.

### Launching Insight

```bash
intrig insight
```

Opens Insight in the default browser at `http://localhost:5050`. The daemon starts automatically if not running.

**Silent mode**:
```bash
intrig insight --silent
```

Starts daemon without opening browser. Access manually at `http://localhost:5050`.

---

## Insight Features

### Endpoint Search

Full-text search across:
- Endpoint paths and HTTP methods
- Operation identifiers
- Request and response schemas
- Parameter names and descriptions

Search results include:
- Generated hook or function name
- Complete type signature
- Import path
- Parameter documentation

### Schema Inspection

View complete type definitions for:
- Request parameters
- Response bodies
- Nested object schemas
- Enum definitions

Schemas display as TypeScript interfaces with:
- Property types
- Required/optional indicators
- Validation constraints
- Description annotations

### Code Examples

Generated code examples for each endpoint:
- Complete import statement
- Hook or function usage
- Type-safe parameter passing
- NetworkState handling patterns

Examples reflect the actual generated code structure.

### Navigation

Browse APIs by:
- **Source**: View all endpoints for a specific API source
- **Tag**: Group endpoints by OpenAPI tags
- **Method**: Filter by HTTP method (GET, POST, etc.)
- **Path**: Navigate by URL structure

---

## Development Workflow Integration

### Endpoint Discovery

When implementing a feature:

1. Launch Insight: `intrig insight`
2. Search for relevant endpoint by name or path
3. Review parameters and response structure
4. Copy generated import path
5. Implement in application code with full type safety

### Schema Reference

When working with complex types:

1. Navigate to endpoint in Insight
2. Click schema type to view complete definition
3. Understand nested structure and validation rules
4. Reference while implementing request/response handling

---

## Daemon State Management

### Cache Location

Daemon stores runtime state in `.intrig/daemon/`:

```
.intrig/
├── daemon/
│   ├── pid         # Process ID file
│   ├── port        # Port configuration
│   └── index/      # Specification indexes
└── specs/          # Source specifications
```

### Index Synchronization

The daemon maintains indexes of specifications. When specifications change:

```bash
# Sync new specifications
intrig sync --all

# Restart daemon to reindex
intrig daemon restart
```

Without restart, Insight will show stale documentation.

---

## Port Configuration

Default port is 5050. Configure alternate port:

```bash
intrig insight --port 3000
```

Port configuration persists in daemon state. Multiple projects can run daemons simultaneously on different ports.

---

## Troubleshooting

### Daemon Won't Start

**Symptom**: `intrig daemon up` fails or times out

**Cause**: Port conflict or previous daemon process still running

**Resolution**:
```bash
# Check for existing daemon
intrig daemon status

# Force stop if status shows running
intrig daemon down

# Check port availability
lsof -i :5050

# Start with alternate port if needed
intrig insight --port 3001
```

### Insight Shows No Endpoints

**Symptom**: Insight interface loads but displays no endpoints

**Cause**: No specifications synchronized or daemon index is empty

**Resolution**:
```bash
# Verify specifications exist
ls .intrig/specs/

# Sync if missing
intrig sync --all

# Restart daemon to reindex
intrig daemon restart
```

### Stale Documentation

**Symptom**: Insight shows outdated endpoint information

**Cause**: Specifications were synced but daemon was not restarted

**Resolution**:
```bash
intrig daemon restart
```

### Port Already in Use

**Symptom**: Daemon fails to start with port conflict error

**Cause**: Another process is using port 5050

**Resolution**:
```bash
# Use alternate port
intrig insight --port 3000

# Or stop conflicting process
lsof -ti:5050 | xargs kill
```

---

## Performance Characteristics

**Indexing Time**:
- Small APIs (< 50 endpoints): < 1 second
- Medium APIs (50-200 endpoints): 1-3 seconds
- Large APIs (> 500 endpoints): 3-5 seconds

**Memory Usage**:
- Base daemon: ~30-50MB
- Per API source: ~10-20MB
- Typical project: 50-100MB total

**Search Performance**:
- Average query response: < 50ms
- Complex pattern matches: < 200ms

---

## CI/CD Considerations

The daemon is designed for local development only. CI/CD pipelines should use:

```bash
# CI mode - no daemon required
intrig sync --ci --all
intrig generate --ci
```

Do not start the daemon in CI environments. Generation and synchronization work independently of the daemon.

---

## Related Documentation

- [Synchronization](./synchronization.md) - Keeping specifications current
- [Code Generation](./code-generation.md) - SDK generation process
- [CLI Reference](../cli-reference.mdx) - Complete command documentation
