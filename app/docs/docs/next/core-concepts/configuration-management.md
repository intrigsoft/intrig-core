# Configuration Management

Intrig uses different configuration approaches for server and client environments in Next.js applications, ensuring optimal performance and security for each execution context.

## Overview

The dual-mode architecture requires separate configuration strategies:

- **Server-side functions** use environment variables for secure, deployment-specific configuration
- **Client-side hooks** receive configuration through the IntrigLayout component
- **Environment separation** ensures sensitive data stays on the server

## Generated Code Structure

Intrig generates the following configuration-related files:

```
src/
├── intrig-layout.tsx         # Next.js layout wrapper
├── intrig-provider.tsx       # Client-side provider  
├── intrig-middleware.ts      # Middleware utilities
├── interfaces.ts             # Configuration types
├── axios-config.ts           # HTTP client configuration
└── [source]/                 # Generated API clients
    └── [controller]/
        └── [operationId]/
            ├── client.ts     # Client hooks
            ├── server.ts     # Server functions
            └── [operation].params.ts # Shared types
```

## Server-Side Configuration

Server functions automatically use environment variables for configuration, allowing different settings per deployment environment without code changes.

### Environment Variables Setup

```bash
# .env.local
DEFAULT_API_URL=https://api.example.com
USERAPI_API_URL=https://users-api.example.com
ANALYTICS_API_URL=https://analytics.example.com

# Next.js public variables for client-side (if needed)
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

### Environment Variable Naming Convention

Intrig follows a specific naming pattern for API endpoints:

- **Pattern**: `{API_SOURCE_NAME}_API_URL` (uppercase)
- **Examples**:
    - For API source "userApi" → `USERAPI_API_URL`
    - For API source "analytics" → `ANALYTICS_API_URL`
- **Fallback**: `DEFAULT_API_URL` for default configuration when source-specific URL is not provided

### Server Function Configuration

```tsx
// Server functions automatically use environment variables
import { getUser } from '@intrig/next/userApi/users/getUser/server';

export async function GET(request: Request) {
  // Configuration is handled internally using process.env
  // Environment variables like USERAPI_API_URL are automatically used
  const user = await getUser({ id: '123' });
  return Response.json(user);
}
```

### Automatic Environment Variable Management

When you add an API source using `intrig add-source`, the environment variable is automatically added to your `.env` file:

```bash
# Automatically added when running: intrig add-source userApi
USERAPI_API_URL=https://users-api.example.com
```

## Client-Side Configuration

Client hooks receive configuration through the IntrigLayout component, which wraps the IntrigProvider internally.

### IntrigLayout Setup

```tsx
// app/layout.tsx
import IntrigLayout from '@intrig/next/intrig-layout';
// Or: import { IntrigLayout } from '@intrig/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <IntrigLayout
          configs={{
            timeout: 10000,
            headers: {
              'X-Client-Version': '1.0.0',
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

### Configuration Interface

The Next.js implementation uses a simplified configuration interface compared to React:

```tsx
// Generated in src/interfaces.ts
interface DefaultConfigs extends CreateAxiosDefaults {
  debounceDelay?: number;
  requestInterceptor?: (
    config: InternalAxiosRequestConfig,
  ) => Promise<InternalAxiosRequestConfig>;
  responseInterceptor?: (
    config: AxiosResponse<any>,
  ) => Promise<AxiosResponse<any>>;
}

interface IntrigProviderProps {
  configs?: DefaultConfigs;  // Single config object (not per-source)
  children: React.ReactNode;
}
```

### Complete Configuration Example

```tsx
// app/layout.tsx
import IntrigLayout from '@intrig/next/intrig-layout';
import type { DefaultConfigs } from '@intrig/next/interfaces';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configs: DefaultConfigs = {
    timeout: 10000,
    headers: {
      'X-Client-Version': '1.0.0',
      'X-Environment': process.env.NODE_ENV,
    },
    requestInterceptor: async (config) => {
      // Add client-side request logic
      return config;
    },
    responseInterceptor: async (response) => {
      // Add client-side response logic  
      return response;
    },
  };

  return (
    <html lang="en">
      <body>
        <IntrigLayout configs={configs}>
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```

## Middleware Configuration

For authentication headers and other dynamic headers, use Intrig middleware:

```tsx
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next/intrig-middleware';

export const middleware = createIntrigMiddleware(async (request) => {
  // Return headers that will be available to server functions
  // These headers get prefixed with 'intrig-' automatically
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-User-ID': request.headers.get('x-user-id') || '',
    'X-Request-ID': crypto.randomUUID(),
  };
});

export const config = {
  matcher: '/api/:path*',
};
```

### Middleware Header Processing

The middleware automatically:
1. Prefixes custom headers with `intrig-`
2. Makes them available to server functions via `getHeaders()`
3. Handles header extraction and cleanup

```tsx
// Generated: src/intrig-middleware.ts
export async function getHeaders() {
  const _headers = await headers();
  const intrigHeaders: Record<string, string> = {};
  
  // Extract headers with 'intrig-' prefix
  _headers.forEach((value, key) => {
    if (key.startsWith('intrig-')) {
      const originalKey = key.replace('intrig-', '');
      intrigHeaders[originalKey] = value;
    }
  });
  
  return intrigHeaders;
}
```

## Key Differences from React Implementation

### Simplified Configuration Structure

**Next.js Implementation:**
```tsx
// Single configuration object for all sources
<IntrigLayout configs={{
  timeout: 10000,
  headers: { 'X-Version': '1.0' }
}}>
  {children}
</IntrigLayout>
```

**Comparison with Traditional React Patterns:**
```tsx
// Traditional React multi-source configuration pattern
// (Note: This is a conceptual comparison, not Intrig React generated code)
<IntrigProvider configs={{
  userApi: { baseURL: 'https://users-api.com' },
  analytics: { baseURL: 'https://analytics-api.com' },
  payments: { baseURL: 'https://payments-api.com' },
}}>
  {children}
</IntrigProvider>
```

The Next.js implementation uses a simplified single configuration approach where API source URLs are managed through environment variables rather than client-side configuration objects.

### Environment Variable Access

```tsx
// Server-side (automatic via getAxiosInstance)
import { getUser } from '@intrig/next/userApi/users/getUser/server';
// Uses process.env.USERAPI_API_URL automatically

// Client-side (explicit configuration)
const config: DefaultConfigs = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // Must be NEXT_PUBLIC_*
  timeout: 10000,
};
```

## Best Practices

### Security Considerations

```tsx
// ✅ Server-side - can use secrets
// Environment variables are automatically used by server functions
// USERAPI_API_URL=https://internal-api.com (private)

// ✅ Client-side - only public data
const clientConfigs: DefaultConfigs = {
  timeout: 10000,
  headers: {
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION,
  },
};

// ❌ Never expose secrets to client
const badClientConfig: DefaultConfigs = {
  headers: {
    'Authorization': process.env.API_SECRET, // 🚨 Security vulnerability!
  },
};
```

### Environment-Specific Configuration

```tsx
// app/lib/config.ts
import type { DefaultConfigs } from '@intrig/next/interfaces';

export function getClientConfigs(): DefaultConfigs {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    timeout: isDevelopment ? 30000 : 10000,
    headers: {
      'X-Environment': process.env.NODE_ENV,
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
    debounceDelay: isDevelopment ? 1000 : 300,
  };
}

// app/layout.tsx
import IntrigLayout from '@intrig/next/intrig-layout';
import { getClientConfigs } from '@/lib/config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <IntrigLayout configs={getClientConfigs()}>
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```

### Configuration Validation

```tsx
// app/lib/validate-config.ts
import { z } from 'zod';
import type { DefaultConfigs } from '@intrig/next/interfaces';

const configSchema = z.object({
  timeout: z.number().positive().optional(),
  debounceDelay: z.number().min(0).optional(),
  headers: z.record(z.string()).optional(),
}) satisfies z.ZodType<Partial<DefaultConfigs>>;

export function validateConfig(config: unknown): DefaultConfigs {
  return configSchema.parse(config);
}

// app/layout.tsx
import IntrigLayout from '@intrig/next/intrig-layout';
import { validateConfig } from '@/lib/validate-config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = validateConfig({
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
    headers: {
      'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
  });

  return (
    <html lang="en">
      <body>
        <IntrigLayout configs={config}>
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```

## Generated File Imports

### Core Configuration Imports

```tsx
// Configuration types
import type { DefaultConfigs } from '@intrig/next/interfaces';

// Layout component
import IntrigLayout from '@intrig/next/intrig-layout';
// Or: import { IntrigLayout } from '@intrig/next';

// Middleware utilities
import { createIntrigMiddleware } from '@intrig/next/intrig-middleware';
```

### Client and Server Imports

```tsx
// Client hooks (automatically configured via IntrigLayout)
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';

// Server functions (automatically use environment variables)
import { getUser } from '@intrig/next/userApi/users/getUser/server';

// Shared parameter types
import type { GetUserParams } from '@intrig/next/userApi/users/getUser/GetUser.params';
```

## Environment Variable Management

### Adding API Sources

When adding new API sources, environment variables are automatically managed:

```bash
# Add a new API source
intrig add-source payments

# This automatically adds to .env:
# PAYMENTS_API_URL=https://api.payments.com
```

### Server Function Environment Resolution

The generated middleware automatically resolves environment variables:

```tsx
// Generated: src/intrig-middleware.ts
export async function getAxiosInstance(key: string) {
  if (clients.has(key)) {
    return clients.get(key)!;
  }
  
  const baseURL = process.env[`${key.toUpperCase()}_API_URL`];
  if (!baseURL) {
    throw new Error(
      `Environment variable ${key.toUpperCase()}_API_URL is not defined.`
    );
  }

  const axiosInstance = axios.create({ baseURL });
  clients.set(key, axiosInstance);
  return axiosInstance;
}
```

This configuration approach ensures security, performance, and maintainability while respecting the unique constraints of Next.js server and client environments and following Intrig's established patterns.