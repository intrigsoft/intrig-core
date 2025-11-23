# Getting Started with Intrig

Implementation of a complete Intrig-powered React application with OpenAPI SDK generation, type-safe hooks, and API integration.

**Implementation scope:**
- Intrig installation and project initialization
- API source configuration from OpenAPI specifications
- SDK generation and compilation to `node_modules`
- Integration of generated hooks in React components

**Technical concepts covered:**
- OpenAPI specification synchronization
- Type-safe SDK generation
- React hook integration patterns
- NetworkState handling
- IntrigProvider configuration

**Prerequisites:**
- Node.js 16+ and npm/yarn/pnpm installed
- React application (existing or new via `create-react-app` or Vite)
- Access to OpenAPI/Swagger specification URL
- Understanding of React hooks and TypeScript

**Estimated time**: 15 minutes

---

## Step 1: Install Intrig

Install the core Intrig packages:

```bash
npm install @intrig/core @intrig/react
# or
yarn add @intrig/core @intrig/react
# or
pnpm add @intrig/core @intrig/react
```

:::warning Legacy Package Conflict
Do not use `npx intrig` at this time. The npm registry entry refers to a deprecated version. Use the locally installed CLI via `npx` from your project directory or install globally with `npm install -g @intrig/core`.
:::

**Verification**: Confirm installation with `npx intrig --version`

---

## Step 2: Initialize Intrig Configuration

From your React project root, initialize Intrig:

```bash
intrig init
```

This command performs three operations:

1. Verifies `@intrig/react` installation
2. Creates `intrig.config.json` with base configuration
3. Updates `.gitignore` to exclude temporary directories

**Generated configuration structure:**

```json
{
  "$schema": "https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/schema.json",
  "sources": [],
  "generator": "react"
}
```

**Verification**: Confirm `intrig.config.json` exists in project root

---

## Step 3: Configure API Source

Add your OpenAPI specification as a source:

```bash
intrig sources add
```

The interactive prompt requests:

- **id**: Source identifier in `camelCase` (e.g., `productApi`)
- **OpenAPI URL**: Location of OpenAPI/Swagger specification

**Technical rationale**: The source identifier becomes the import path namespace. Choose identifiers that clearly represent the API domain.

**Example configuration:**

```json
{
  "sources": [
    {
      "id": "productApi",
      "url": "https://api.example.com/swagger.json"
    }
  ]
}
```

:::note Demo Backend
For testing, use the [intrig-demo-backend](https://github.com/intrigsoft/intrig-demo-backend) NestJS application. Clone and run with `npm install && npm start`. The Swagger specification will be available at `http://localhost:5001/swagger.json`.
:::

**Verification**: Confirm source entry appears in `intrig.config.json`

---

## Step 4: Generate SDK

Synchronize the API specification and generate the SDK:

```bash
intrig sync --all && intrig generate
```

**Process breakdown:**

1. `intrig sync --all` fetches and normalizes OpenAPI specifications
2. `intrig generate` generates TypeScript code, compiles it, and publishes to `node_modules`

The generated SDK is now available for import using the configured source identifier.

**Verification**: Check `node_modules/@intrig/react` for generated code

---

## Step 5: Configure IntrigProvider

Wrap your application root with `IntrigProvider` to configure backend integration:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IntrigProvider } from '@intrig/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntrigProvider configs={{
      productApi: {
        baseURL: 'https://api.example.com',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }}>
      <App />
    </IntrigProvider>
  </StrictMode>,
)
```

**Technical rationale**: IntrigProvider establishes global configuration for API sources. The `configs` object keys must match source identifiers from `intrig.config.json`.

**Verification**: Application should compile without errors

---

## Step 6: Implement Generated Hook

Integrate a generated hook in a React component:

```tsx
import { useGetEmployee } from '@intrig/react/productApi/Employee/getEmployee/useGetEmployee'
import { useEffect } from 'react';
import { isSuccess, isError } from '@intrig/react';

function EmployeeProfile({ employeeId }: { employeeId: number }) {
  const [employeeState, getEmployee] = useGetEmployee({ clearOnUnmount: true });

  useEffect(() => {
    getEmployee({ id: employeeId });
  }, [employeeId]);

  if (isError(employeeState)) {
    return <div>Error: {employeeState.error.message}</div>;
  }

  if (isSuccess(employeeState)) {
    return <div>Employee: {employeeState.data.name}</div>;
  }

  return <div>Loading...</div>;
}

export default EmployeeProfile;
```

**Technical rationale**:
- `useGetEmployee` is a stateful hook that maintains request state in the global store
- `clearOnUnmount: true` resets state when the component unmounts
- Type guards (`isSuccess`, `isError`) provide type-safe access to state-specific fields

**Verification**: Component should render employee data or error state

---

## Step 7: Synchronize API Changes

When the backend API changes, update the SDK:

```bash
intrig sync --all && intrig generate
```

Breaking changes in the API will surface as TypeScript compilation errors, enabling detection at build time rather than runtime.

**Verification**: Run `npm run build` or `tsc` to validate type compatibility

---

## Optional: Explore with Intrig Insight

Launch the Insight documentation browser:

```bash
intrig insight
```

Insight provides searchable documentation for:
- Generated hooks with complete type signatures
- Request and response schemas
- Endpoint parameters and descriptions

Access the interface at `http://localhost:5050`

---

## Implementation Summary

This implementation demonstrates:
- OpenAPI-driven SDK generation with type safety
- React hook integration with NetworkState handling
- Global configuration through IntrigProvider
- Compile-time validation of API contracts
- Development workflow for API synchronization

## Extension Possibilities

- Implement authentication with token management
- Add error handling patterns with retry logic
- Configure multiple API sources
- Integrate with Next.js server components
- Implement optimistic updates for mutations

**Related documentation:**
- [Core Concepts](./core-concepts.md)
- [React Hook Conventions](./react/core-concepts/hook-conventions.md)
- [NetworkState Specification](./react/api/network-state.md)
