# Next.js Initialization

Configuration and setup procedures for Intrig Next.js integration. Documents package installation, project initialization, and IntrigLayout configuration for App Router applications.

---

## Package Installation

Install Intrig core and Next.js framework packages:

```bash
npm install @intrig/core @intrig/next
# or
yarn add @intrig/core @intrig/next
# or
pnpm add @intrig/core @intrig/next
```

**Package roles:**
- `@intrig/core`: CLI tools, code generation, and synchronization
- `@intrig/next`: Next.js-specific server functions, client hooks, and middleware

---

## Project Initialization

Initialize Intrig configuration from the project root:

```bash
intrig init
```

### Initialization Process

The initialization command performs these operations:

**Configuration File Creation**: Generates `intrig.config.json` with Next.js settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/intrigsoft/intrig-registry/refs/heads/main/schema.json",
  "sources": [],
  "generator": "next"
}
```

**Repository Configuration**: Updates `.gitignore` to exclude generated artifacts:

```
# Intrig
.intrig/cache/
.intrig/daemon/
node_modules/@intrig/
```

**Framework Detection**: Identifies Next.js projects through `package.json` dependencies and configures the Next.js generator.

---

## IntrigLayout Setup

Configure IntrigLayout in the root layout to enable client-side Intrig functionality.

### App Router Configuration

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <IntrigLayout
          configs={{
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          }}
        >
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```

### Configuration Options

IntrigLayout accepts a `configs` prop for client-side configuration:

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for client-side API requests |
| `timeout` | `number` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | Default headers for client requests |
| `requestInterceptor` | `function` | Request preprocessing function |
| `responseInterceptor` | `function` | Response postprocessing function |

Complete configuration options documented in [IntrigLayout API Reference](./api/intrig-layout.md).

---

## Server-Side Configuration

Server functions use environment variables for configuration.

### Environment Variables

```env
# .env.local
DEFAULT_API_URL=https://api.yourservice.com
USERS_API_URL=https://users-api.example.com
ANALYTICS_API_URL=https://analytics.example.com
```

### Environment Variable Naming

- **Pattern**: `{SOURCE_ID}_API_URL` (uppercase)
- **Example**: For source `userApi` → `USERAPI_API_URL`
- **Fallback**: `DEFAULT_API_URL` when source-specific URL not provided

---

## Middleware Configuration

Configure middleware for authentication and header injection:

```tsx
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-User-ID': request.headers.get('x-user-id') || ''
  };
});

export const config = {
  matcher: '/api/:path*'
};
```

Middleware runs before API routes and server components, enabling centralized request preprocessing.

---

## Post-Initialization Steps

After initialization and configuration:

### 1. Configure API Sources

Add OpenAPI specification sources:

```bash
intrig sources add
```

Interactive prompts request:
- Source identifier (camelCase, e.g., `userApi`)
- OpenAPI specification URL

### 2. Synchronize Specifications

Fetch OpenAPI specifications:

```bash
intrig sync --all
```

### 3. Generate SDK

Generate type-safe server functions and client hooks:

```bash
intrig generate
```

### 4. Use Generated Code

**Server-side**:
```tsx
// app/api/users/route.ts
import { getUserAction } from '@intrig/next/userApi/users/getUser/action';

export async function GET() {
  const user = await getUserAction({ id: '123' });
  return Response.json(user);
}
```

**Client-side**:
```tsx
// components/UserProfile.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';

export function UserProfile({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser({
    fetchOnMount: true,
    params: { id: userId }
  });
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

**Client-side** (requires `NEXT_PUBLIC_` prefix):
```tsx
<IntrigLayout
  configs={{
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.NEXT_PUBLIC_TIMEOUT || '5000')
  }}
>
  {children}
</IntrigLayout>
```

**Server-side** (no prefix required):
```env
# .env.local
USERAPI_API_URL=https://api.example.com
API_TOKEN=your-secret-token
```

### Dynamic Configuration

Update configuration based on runtime conditions:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const configs = {
    baseURL: isDevelopment
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_API_URL,
    timeout: isDevelopment ? 30000 : 5000
  };

  return (
    <IntrigLayout configs={configs}>
      {children}
    </IntrigLayout>
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

**Symptom**: Generated code incompatible with Next.js

**Resolution**:
- Manually edit `intrig.config.json` and set `"generator": "next"`
- Regenerate SDK with `intrig generate`

### Environment Variables Not Found

**Symptom**: Server functions fail with missing URL error

**Resolution**:
- Verify environment variables in `.env.local`
- Check naming matches pattern: `{SOURCE_ID}_API_URL`
- Restart development server after adding variables

### IntrigLayout Not Found

**Symptom**: Import error for IntrigLayout

**Resolution**:
- Verify `@intrig/next` installation: `npm list @intrig/next`
- Reinstall if missing: `npm install @intrig/next`
- Check import path: `import { IntrigLayout } from '@intrig/next';`

---

## Related Documentation

- [IntrigLayout API](./api/intrig-layout.md) - Complete configuration reference
- [Server Functions](./api/server-functions.md) - Server-side API integration
- [Middleware](./api/middleware.md) - Request preprocessing configuration
- [Getting Started](../getting-started.md) - Comprehensive setup tutorial
