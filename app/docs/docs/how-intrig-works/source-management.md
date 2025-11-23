# Source Management

API source configuration and registry management. Defines OpenAPI specification locations, manages the set of backend services that generate SDK code, and maintains the mapping between source identifiers and specification URLs.

---

## Source Configuration

Sources represent backend APIs that Intrig generates SDKs for. Each source requires:

- **Unique identifier**: Used in import paths and configuration references
- **OpenAPI specification URL**: Location of the API contract definition

Sources are stored in `intrig.config.json` and used by synchronization and generation processes.

---

## Adding Sources

### Interactive Addition

```bash
intrig sources add
```

Interactive prompts request:

**Source ID**:
- Must be valid as a TypeScript identifier
- Convention: `camelCase` (e.g., `userApi`, `productService`)
- Becomes part of import paths: `@intrig/react/{sourceId}/...`

**Specification URL**:
- HTTP/HTTPS URL to OpenAPI/Swagger specification
- Local file paths supported: `file:///path/to/spec.json`
- Must return valid OpenAPI 2.0/3.0 specification

### Direct Addition with URL

```bash
intrig sources add https://api.example.com/swagger.json
```

Prompts only for source ID when URL is provided.

---

## Configuration Structure

Sources are stored in `intrig.config.json`:

```json
{
  "sources": [
    {
      "id": "userApi",
      "url": "https://api.example.com/v1/swagger.json"
    },
    {
      "id": "productApi",
      "url": "https://products.example.com/openapi.yaml"
    }
  ],
  "generator": "react"
}
```

---

## Listing Sources

```bash
intrig sources ls
```

Displays configured sources with:
- Source identifier
- Specification URL
- Last synchronization timestamp (if available)

**Example output**:

```
Sources:
  userApi
    URL: https://api.example.com/v1/swagger.json
    Last Sync: 2024-01-15 10:30:00

  productApi
    URL: https://products.example.com/openapi.yaml
    Last Sync: Never
```

---

## Removing Sources

```bash
intrig sources rm
```

Interactive selection of source to remove. Confirms before deletion.

**Effects of removal**:
- Removes source from `intrig.config.json`
- Does not delete synchronized specifications from `.intrig/specs/`
- Does not remove generated code from `node_modules`

To fully clean up after source removal:

```bash
# Remove source configuration
intrig sources rm

# Remove synchronized specification
rm .intrig/specs/{sourceId}-latest.json

# Regenerate to remove from node_modules
intrig generate
```

---

## Source Identifiers

Source identifiers function as:

1. **Import Path Namespace**: `@intrig/{framework}/{sourceId}/...`
2. **Configuration Key**: In provider configs and middleware
3. **File System Path**: In `.intrig/specs/{sourceId}-latest.json`

### Identifier Requirements

- Valid TypeScript identifier (alphanumeric and underscore)
- Unique within project
- Convention: `camelCase`
- Descriptive of API domain

**Good identifiers**:
- `userApi`
- `paymentService`
- `analyticsApi`

**Problematic identifiers**:
- `api` (too generic)
- `user-api` (hyphen not valid in TypeScript)
- `API_USER` (convention is camelCase)

---

## Specification URL Configuration

### Remote Specifications

```json
{
  "id": "userApi",
  "url": "https://api.example.com/swagger.json"
}
```

Intrig fetches from the URL during synchronization. Ensure:
- URL is accessible from development environment
- Specification is current and valid
- URL returns JSON or YAML content

### Local Specifications

```json
{
  "id": "userApi",
  "url": "file:///absolute/path/to/spec.json"
}
```

Useful for:
- Local development without network access
- Version-controlled specifications
- Custom specification files

### Dynamic URLs

Specifications can be served from:
- Backend application endpoints (e.g., `/swagger.json`)
- API gateway documentation endpoints
- Static file servers
- Version control hosting (with raw file URLs)

---

## Multi-Source Configuration

Projects commonly integrate multiple backend services:

```json
{
  "sources": [
    {
      "id": "userApi",
      "url": "https://users.example.com/openapi.json"
    },
    {
      "id": "productApi",
      "url": "https://products.example.com/openapi.json"
    },
    {
      "id": "analyticsApi",
      "url": "https://analytics.example.com/swagger.json"
    }
  ]
}
```

Each source generates independent code. Import paths remain isolated:

```typescript
import { useGetUser } from '@intrig/react/userApi/users/getUser/useGetUser';
import { useGetProduct } from '@intrig/react/productApi/products/getProduct/useGetProduct';
```

---

## Source Updates

Modifying source configurations:

**URL Changes**:
```bash
# Edit intrig.config.json directly
# Then resync
intrig sync --id userApi
```

**Identifier Changes**:
```bash
# Remove old source
intrig sources rm

# Add with new identifier
intrig sources add

# Update import statements in code
# Regenerate SDK
intrig generate
```

---

## Verification

After source configuration:

```bash
# Verify source is registered
intrig sources ls

# Test synchronization
intrig sync --id {sourceId}

# Check specification was fetched
ls -la .intrig/specs/{sourceId}-latest.json

# Generate SDK
intrig generate
```

---

## Common Issues

### Invalid Specification URL

**Symptom**: Synchronization fails with network or parsing errors

**Cause**: URL is unreachable, returns invalid content, or specification has syntax errors

**Resolution**: Verify URL accessibility and specification validity. Test URL in browser or with `curl`.

### Duplicate Source ID

**Symptom**: Configuration validation fails

**Cause**: Source ID already exists in configuration

**Resolution**: Choose unique identifier or remove existing source first.

### Import Path Conflicts

**Symptom**: TypeScript errors with ambiguous imports

**Cause**: Multiple sources have operations with identical paths

**Resolution**: Source identifiers namespace imports, preventing conflicts. Ensure source IDs are descriptive.

---

## Related Documentation

- [Synchronization](./synchronization.md) - Fetching specifications after source configuration
- [Initialization](./initialization.md) - Initial project setup
- [CLI Reference](../cli-reference.mdx) - Complete command documentation
