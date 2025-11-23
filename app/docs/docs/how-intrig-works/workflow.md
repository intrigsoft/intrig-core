# Complete Development Workflow

End-to-end integration workflow from backend API changes through SDK regeneration, type checking, and implementation. Documents the feedback loop between specification changes and compile-time validation.

---

## Workflow Overview

The Intrig development workflow establishes a deterministic pipeline from API contract definition to type-safe frontend implementation:

```
Backend Change → Update Spec → Sync → Generate → Type Check → Fix → Implement
```

Each step provides immediate feedback, with breaking changes detected at compile time rather than runtime.

---

## Initial Project Setup

### One-Time Configuration

```bash
# 1. Install Intrig packages
npm install @intrig/core @intrig/react

# 2. Initialize configuration
intrig init

# 3. Add API sources
intrig sources add

# 4. Synchronize specifications
intrig sync --all

# 5. Generate SDK
intrig generate

# 6. Start daemon (optional, for Insight)
intrig daemon up
```

**Result**: Project configured with type-safe SDK ready for import.

---

## Standard Development Cycle

### Scenario: Implementing New Feature

**Initial State**: Backend exposes new endpoint via OpenAPI specification.

#### Step 1: Synchronize Specification

```bash
intrig sync --all
```

Fetches updated specification containing new endpoint definition.

**Verification**: Check `.intrig/specs/{sourceId}-latest.json` modification time.

#### Step 2: Regenerate SDK

```bash
intrig generate
```

Generates new hooks/functions for the added endpoint.

**Verification**: New imports available in `node_modules/@intrig/{framework}`.

#### Step 3: Discover Endpoint

Using Insight:
```bash
intrig insight
```

Search for endpoint by name, path, or operation ID. Review:
- Type signature
- Required parameters
- Response structure
- Example usage

#### Step 4: Implement Feature

```typescript
import { useGetProducts } from '@intrig/react/productApi/products/getProducts/useGetProducts';
import { isSuccess, isError, isPending } from '@intrig/react';

function ProductList() {
  const [productsState, getProducts] = useGetProducts({
    fetchOnMount: true,
    clearOnUnmount: true
  });

  if (isPending(productsState)) {
    return <LoadingSpinner />;
  }

  if (isError(productsState)) {
    return <ErrorDisplay error={productsState.error} />;
  }

  if (isSuccess(productsState)) {
    return (
      <ul>
        {productsState.data.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    );
  }

  return null;
}
```

**Result**: Type-safe implementation with compile-time validation.

---

## Handling Breaking Changes

### Scenario: Backend Modifies Endpoint Contract

Backend removes `phoneNumber` field from `User` schema.

#### Step 1: Detect Change

```bash
# Sync updated specification
intrig sync --all

# Regenerate SDK
intrig generate
```

#### Step 2: Compilation Failure

TypeScript compiler reports errors at all usage sites:

```typescript
const user = await getUser({ id: '123' });
console.log(user.phoneNumber);
//          ^^^^^^^^^^^^^^^^
// Error: Property 'phoneNumber' does not exist on type 'User'
```

**Feedback**: Immediate, precise error location. No runtime discovery required.

#### Step 3: Fix Implementation

Update code to handle missing field:

```typescript
const user = await getUser({ id: '123' });
// phoneNumber no longer available
console.log(user.email); // Alternative field
```

#### Step 4: Verify

```bash
npm run build
# or
tsc --noEmit
```

**Result**: Breaking change detected and resolved before deployment.

---

## Parameter Change Workflow

### Scenario: Endpoint Adds Required Parameter

Backend adds required `organizationId` parameter to `getUsers` endpoint.

#### Step 1: Sync and Generate

```bash
intrig sync --all && intrig generate
```

#### Step 2: Type Errors Surface

```typescript
// Previous call
getUsers(); // Error: Missing required parameter 'organizationId'

// Updated call
getUsers({ organizationId: currentOrgId }); // Correct
```

**Feedback**: TypeScript enforces new parameter requirement at compile time.

#### Step 3: Update Call Sites

Search for all usages:

```bash
# Find all usages in codebase
grep -r "getUsers(" src/
```

Update each call site with required parameter.

**Result**: All integration points updated with compiler validation.

---

## Response Schema Change Workflow

### Scenario: Backend Modifies Response Structure

Backend changes `products` endpoint response from array to paginated object:

**Before**:
```typescript
Product[]
```

**After**:
```typescript
{
  items: Product[];
  page: number;
  totalPages: number;
}
```

#### Step 1: Sync and Generate

```bash
intrig sync --all && intrig generate
```

#### Step 2: Type Errors Surface

```typescript
const [productsState] = useGetProducts();

if (isSuccess(productsState)) {
  // Error: productsState.data is not array
  productsState.data.map(p => ...)
  //                ^^^
  // Error: Property 'map' does not exist
}
```

#### Step 3: Fix Implementation

```typescript
if (isSuccess(productsState)) {
  const { items, page, totalPages } = productsState.data;
  items.map(p => ...)
  // Pagination handling with page, totalPages
}
```

**Result**: Structure change handled with compiler guidance.

---

## operationId Change Workflow

### Scenario: Backend Renames Operation

OpenAPI `operationId` changes from `getUser` to `getUserById`.

#### Step 1: Sync and Generate

```bash
intrig sync --all && intrig generate
```

#### Step 2: Import Failures

```typescript
import { useGetUser } from '@intrig/react/userApi/users/getUser/useGetUser';
//       ^^^^^^^^^^
// Error: Module not found
```

Hook name changed to `useGetUserById`.

#### Step 3: Update Imports

Search and replace:

```bash
# Find usages
grep -r "useGetUser" src/

# Update imports
import { useGetUserById } from '@intrig/react/userApi/users/getUserById/useGetUserById';
```

**Alternative**: Use Insight to search by path or method to find new hook name.

**Result**: Imports updated to match new operation identifier.

---

## CI/CD Integration

### Pipeline Configuration

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      - name: Sync API specifications
        run: intrig sync --ci --all

      - name: Generate SDK
        run: intrig generate --ci

      - name: Type check
        run: tsc --noEmit

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

**Key Points**:
- Use `--ci` flag to avoid daemon dependency
- Sync before generation
- Type check validates API contract compliance
- Breaking changes fail the build

---

## Team Workflow

### Backend Team

1. Update OpenAPI specification for API changes
2. Deploy specification to accessible URL
3. Notify frontend team of changes
4. (Optional) Provide changelog or migration guide

### Frontend Team

1. Run `intrig sync --all && intrig generate`
2. Address TypeScript compilation errors
3. Update implementations based on type changes
4. Test changes locally
5. Push updated code

**Communication**: Specification serves as the authoritative contract. No manual type coordination required.

---

## Troubleshooting Common Workflows

### Workflow: Imports Work but Types Are Wrong

**Symptom**: Imports succeed but runtime data doesn't match types

**Cause**: Specification out of sync with deployed backend

**Resolution**:
```bash
# Ensure specification URL points to current deployment
intrig sync --all --id affectedApi

# Regenerate
intrig generate

# Verify specification matches deployed API
```

### Workflow: SDK Generation Fails

**Symptom**: `intrig generate` fails with errors

**Cause**: Invalid or incomplete specification

**Resolution**:
```bash
# Check specification validity
cat .intrig/specs/{sourceId}-latest.json

# Validate OpenAPI specification
npx @apidevtools/swagger-cli validate .intrig/specs/{sourceId}-latest.json

# Contact backend team if specification is invalid
```

### Workflow: Daemon Shows Stale Endpoints

**Symptom**: Insight displays outdated documentation

**Cause**: Daemon not restarted after sync

**Resolution**:
```bash
intrig daemon restart
```

---

## Best Practices

### Regular Synchronization

Sync specifications at the start of each development session:

```bash
# Morning routine
git pull
npm install
intrig sync --all && intrig generate
```

Ensures local SDK matches current backend contracts.

### Automated Synchronization

Add postinstall script:

```json
{
  "scripts": {
    "postinstall": "intrig sync --all && intrig generate"
  }
}
```

Automatically regenerates SDK after dependency installation.

### Type-Check Frequently

Run type checking during development:

```bash
# Watch mode
tsc --noEmit --watch
```

Catch integration issues immediately.

### Commit Specifications

Include synchronized specifications in version control:

```bash
git add .intrig/specs/
git commit -m "chore: sync API specifications"
```

Enables team collaboration and historical tracking.

---

## Performance Optimization

### Selective Synchronization

For large projects with multiple sources, sync selectively:

```bash
# Only sync changed source
intrig sync --id userApi

# Generate for all sources
intrig generate
```

Reduces synchronization time when only one API changes.

### Parallel Development

Multiple developers can work independently:
- Each runs local daemon on different port if needed
- Specifications sync to shared version control
- No coordination required beyond spec updates

---

## Related Documentation

- [Synchronization](./synchronization.md) - Specification sync details
- [Code Generation](./code-generation.md) - SDK generation process
- [Daemon and Insight](./daemon-insight.md) - Development tool usage
- [Getting Started](../getting-started.md) - Initial setup tutorial
