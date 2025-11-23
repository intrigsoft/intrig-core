# React Initialization

Configuration and setup procedures for Intrig React integration. Documents package installation, project initialization, and IntrigProvider configuration.

---

## Package Installation

Install Intrig core and React framework packages:

```bash
npm install @intrig/core @intrig/react
# or
yarn add @intrig/core @intrig/react
# or
pnpm add @intrig/core @intrig/react
```

**Package roles:**
- `@intrig/core`: CLI tools, code generation, and synchronization
- `@intrig/react`: React-specific hooks, components, and state management

---

## Project Initialization

Initialize Intrig configuration from the project root:

```bash
intrig init
```

### Initialization Process

The initialization command performs these operations:

**Configuration File Creation**: Generates `intrig.config.json` with base settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/schema.json",
  "sources": [],
  "generator": "react"
}
```

**Repository Configuration**: Updates `.gitignore` to exclude generated artifacts:

```
# Intrig
.intrig/cache/
.intrig/daemon/
node_modules/@intrig/
```

**Framework Detection**: Identifies React projects through `package.json` dependencies and configures the React generator.

---

## IntrigProvider Setup

Configure the provider at the application root to enable Intrig functionality throughout the component tree.

### Basic Configuration

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntrigProvider } from '@intrig/react';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntrigProvider configs={{
      default: {
        baseURL: 'https://api.example.com',
        timeout: 5000
      }
    }}>
      <App />
    </IntrigProvider>
  </StrictMode>
);
```

### Multi-Source Configuration

Configure multiple API sources with independent settings:

```tsx
<IntrigProvider configs={{
  userApi: {
    baseURL: 'https://users-api.example.com',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 3000
  },
  analyticsApi: {
    baseURL: 'https://analytics.example.com',
    timeout: 10000
  }
}}>
  <App />
</IntrigProvider>
```

### Configuration Options

IntrigProvider accepts `configs` object where keys are source identifiers matching `intrig.config.json` sources. Each source configuration supports:

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for API requests |
| `timeout` | `number` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | Default headers for all requests |
| `requestInterceptor` | `function` | Request preprocessing function |
| `responseInterceptor` | `function` | Response postprocessing function |

Complete configuration options documented in [IntrigProvider API Reference](./api/intrig-provider.md).

---

## Post-Initialization Steps

After initialization and provider setup:

### 1. Configure API Sources

Add OpenAPI specification sources to `intrig.config.json`:

```bash
intrig sources add
```

Interactive prompts will request:
- Source identifier (camelCase, e.g., `userApi`)
- OpenAPI specification URL

### 2. Synchronize Specifications

Fetch OpenAPI specifications:

```bash
intrig sync --all
```

### 3. Generate SDK

Generate type-safe hooks and utilities:

```bash
intrig generate
```

### 4. Import Generated Hooks

Use generated hooks in components:

```tsx
import { useGetUser } from '@intrig/react/userApi/users/getUser/useGetUser';

function UserProfile() {
  const [userState, getUser] = useGetUser();
  // Implementation
}
```

---

## Verification

Confirm successful initialization:

```bash
# Verify configuration exists
cat intrig.config.json

# Check Intrig CLI accessibility
intrig --version

# Verify gitignore updates
grep "# Intrig" .gitignore

# Test SDK generation
intrig generate
```

---

## Configuration Management

### Environment-Specific Settings

Use environment variables for deployment-specific configuration:

```tsx
<IntrigProvider configs={{
  userApi: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.REACT_APP_TIMEOUT || '5000')
  }
}}>
  <App />
</IntrigProvider>
```

### Dynamic Configuration

Update configuration based on runtime conditions:

```tsx
function Root() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <IntrigProvider configs={{
      userApi: {
        baseURL: isDevelopment
          ? 'http://localhost:3000'
          : 'https://api.production.com',
        timeout: isDevelopment ? 30000 : 5000
      }
    }}>
      <App />
    </IntrigProvider>
  );
}
```

---

## Troubleshooting

### Configuration File Not Created

**Symptom**: `intrig.config.json` missing after initialization

**Resolution**:
- Confirm current directory contains `package.json`
- Verify write permissions in project directory
- Run `intrig init` from project root

### Wrong Generator Configured

**Symptom**: Generated code incompatible with React

**Resolution**:
- Manually edit `intrig.config.json` and set `"generator": "react"`
- Regenerate SDK with `intrig generate`

### Provider Not Found

**Symptom**: Import error for IntrigProvider

**Resolution**:
- Verify `@intrig/react` installation: `npm list @intrig/react`
- Reinstall if missing: `npm install @intrig/react`
- Check import path: `import { IntrigProvider } from '@intrig/react';`

---

## Related Documentation

- [IntrigProvider API](./api/intrig-provider.md) - Complete configuration reference
- [Getting Started](../getting-started.md) - Comprehensive setup tutorial
- [How Intrig Works: Initialization](../how-intrig-works/initialization.md) - Detailed initialization process
