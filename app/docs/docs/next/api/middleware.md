# Intrig Middleware

The **Intrig Middleware** is a specialized Next.js middleware system that enables server-side request preprocessing, header injection, and authentication handling for Intrig-powered applications. It runs at the edge before requests reach API routes or server components, providing centralized control over request/response processing.

## Overview

Intrig Middleware serves as the preprocessing layer for all Intrig functionality, managing:
- Dynamic header injection with secure prefix handling
- Authentication token processing and forwarding
- Request preprocessing before reaching server functions
- Server-side configuration and environment variable access
- Axios instance caching and management for server functions
- State hydration coordination between server and client

## Core Functions

### `createIntrigMiddleware`

The primary function for creating Intrig-compatible Next.js middleware.

**Type Signature:**
```tsx
function createIntrigMiddleware(
  headersFunction: HeadersFunction
): (request: NextRequest) => Promise<NextResponse>

type HeadersFunction = (request: NextRequest) => Promise<Record<string, string>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `headersFunction` | `HeadersFunction` | Async function that receives the Next.js request and returns headers to inject |

**Returns:** A Next.js middleware function that can be exported as `middleware`

### `getHeaders`

Server-side utility to retrieve Intrig-injected headers within API routes and server components.

**Type Signature:**
```tsx
async function getHeaders(): Promise<Record<string, string>>
```

**Returns:** Object containing all headers that were injected by the middleware (without `intrig-` prefix)

### `getAxiosInstance`

Creates and caches Axios instances for server-side API calls with environment-based configuration.

**Type Signature:**
```tsx
async function getAxiosInstance(key: string): Promise<AxiosInstance>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | API source identifier that maps to environment variable `{KEY}_API_URL` |

**Returns:** Configured Axios instance for the specified API source

## Basic Usage

### Simple Authentication Middleware

```tsx
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'Content-Type': 'application/json',
  };
});

export const config = {
  matcher: '/api/:path*',
};
```

## Server-Side Integration

### Using Headers in API Routes

```tsx
// app/api/users/route.ts
import { getHeaders } from '@intrig/next';

export async function GET() {
  const headers = await getHeaders();
  
  // Headers injected by middleware are now available
  const authToken = headers['Authorization'];
  const userId = headers['X-User-ID'];
  
  // Use in your API logic
  const response = await fetch('https://api.example.com/users', {
    headers: {
      'Authorization': authToken,
      'X-User-ID': userId,
    },
  });
  
  return Response.json(await response.json());
}
```

## Advanced Configuration

### Environment Variable Management

```dotenv
// .env.local
API_TOKEN=your-secret-token
USERS_API_URL=https://users-api.example.com
PRODUCTS_API_URL=https://products-api.example.com
ANALYTICS_API_URL=https://analytics-api.example.com

# Development overrides
DEV_API_URL=http://localhost:8080
```

```tsx
// middleware.ts
export const middleware = createIntrigMiddleware(async (request) => {
  const isDev = process.env.NODE_ENV === 'development';
  const baseToken = process.env.API_TOKEN;
  
  return {
    'Authorization': `Bearer ${baseToken}`,
    'X-Environment': isDev ? 'development' : 'production',
    'X-Debug': isDev ? 'true' : 'false',
  };
});
```

## Header Processing

### Automatic Prefix Management

Intrig middleware automatically manages header prefixing to avoid conflicts:

```tsx
// In middleware.ts - you return clean headers
return {
  'Authorization': 'Bearer token123',
  'X-User-ID': 'user456',
};

// Internally stored as:
// 'intrig-Authorization': 'Bearer token123'
// 'intrig-X-User-ID': 'user456'

// Retrieved via getHeaders() as:
{
  'Authorization': 'Bearer token123',
  'X-User-ID': 'user456'
}
```

## Error Handling

### Graceful Fallbacks

```tsx
// middleware.ts
export const middleware = createIntrigMiddleware(async (request) => {
  try {
    const token = await getAuthToken(request);
    return {
      'Authorization': `Bearer ${token}`,
      'X-Status': 'authenticated',
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Continue with limited headers instead of failing
    return {
      'X-Status': 'anonymous',
      'X-Error': 'auth-failed',
    };
  }
});
```

## Performance Considerations

```tsx
// Axios instances are automatically cached
const userApi = await getAxiosInstance('users');     // Creates new instance
const userApi2 = await getAxiosInstance('users');    // Returns cached instance

// middleware.ts - Minimize overhead with specific matchers
export const config = {
  matcher: '/api/:path*',  // Only run on API routes
};
```

## Integration Patterns

### With IntrigLayout

```tsx
// middleware.ts
export const middleware = createIntrigMiddleware(async (request) => {
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-Request-ID': crypto.randomUUID(),
  };
});

// app/layout.tsx - Headers are automatically available
import { IntrigLayout } from '@intrig/next';

export default function RootLayout({ children }) {
  return (
    <IntrigLayout
      configs={{
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        timeout: 5000,
      }}
    >
      {children}
    </IntrigLayout>
  );
}
```

## Best Practices

### 1. Environment Security
```tsx
// Never expose sensitive data to client-side
return {
  'Authorization': `Bearer ${process.env.API_SECRET}`, // ✅ Server-only
  'X-Public-Key': process.env.NEXT_PUBLIC_API_KEY,    // ✅ Public env var
};
```

### 2. Matcher Configuration
```tsx
// Be specific with matchers to reduce overhead
export const config = {
  matcher: [
    '/api/:path*',           // API routes
    '/server-actions/:path*', // Server actions
  ],
};
```

### 3. Header Naming
```tsx
// Use consistent header naming conventions
return {
  'Authorization': `Bearer ${token}`,    // Standard header
  'X-User-ID': userId,                  // Custom headers with X- prefix
  'X-Request-ID': requestId,            // Unique identifiers
  'X-Environment': environment,         // Environment indicators
};
```

### 4. Error Boundaries
```tsx
// Always handle errors gracefully
export const middleware = createIntrigMiddleware(async (request) => {
  try {
    return await getProductionHeaders(request);
  } catch (error) {
    // Log but don't throw - allow request to continue
    console.error('Middleware error:', error);
    return {}; // Return empty headers instead of failing
  }
});
```

## Related

- [IntrigLayout](/docs/next/api/intrig-layout) - Learn about the client-side layout wrapper
- [Server Functions](/docs/next/api/server-functions) - Understand how server functions consume middleware headers
- [Core Concepts: Middleware Integration](/docs/next/core-concepts/middleware-integration) - Architectural overview
- [Tutorial: Authentication Setup](/docs/next/tutorial/authentication) - Step-by-step authentication implementation