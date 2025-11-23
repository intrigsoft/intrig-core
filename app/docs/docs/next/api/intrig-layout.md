# IntrigLayout

The **IntrigLayout** is the foundational server-side layout component for integrating Intrig into Next.js applications. It wraps the `IntrigProvider` and manages server-side state hydration, providing seamless integration between server and client components.

## Overview

IntrigLayout serves as the Next.js-specific entry point for all Intrig functionality, managing:
- Server-side state hydration from headers
- Global network state initialization for client components
- Provider configuration with server-aware defaults
- Integration with Next.js App Router patterns
- Seamless transition from server-rendered content to client-side interactivity

## Props

### `IntrigLayoutProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | Child components that will have access to Intrig context |
| `configs` | `DefaultConfigs` | No | `undefined` | Configuration object for API sources (server-side compatible) |

### `DefaultConfigs`

The `DefaultConfigs` interface extends Axios's `CreateAxiosDefaults` with additional Intrig-specific options:

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for API requests |
| `timeout` | `number` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | Default headers for requests |
| `debounceDelay` | `number` | Delay in milliseconds for debouncing requests |
| `requestInterceptor` | `(config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>` | Custom request interceptor function |
| `responseInterceptor` | `(config: AxiosResponse<any>) => Promise<AxiosResponse<any>>` | Custom response interceptor function |

## Basic Usage

### App Router Layout Setup

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';
import { ReactNode } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <IntrigLayout
          configs={{
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
            },
          }}
        >
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```

### Environment-Based Configuration

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configs = {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '5000'),
    headers: {
      'Content-Type': 'application/json',
      'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
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

### Conditional Configuration

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const configs = {
    baseURL: isDevelopment 
      ? 'http://localhost:8080/api'
      : process.env.NEXT_PUBLIC_API_URL,
    timeout: isDevelopment ? 10000 : 5000,
    headers: {
      'Content-Type': 'application/json',
      ...(isDevelopment && { 'X-Debug': 'true' }),
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

## Server-Side Features

### Hydration Management

IntrigLayout automatically handles server-side state hydration:

```tsx
// The layout reads hydrated responses from headers
// and passes them to IntrigProvider as initState
async function IntrigLayout({ children, configs }) {
  let headersData = await headers();
  let hydratedResponsesStr = headersData.get('INTRIG_HYDRATED');
  let hydratedResponses = hydratedResponsesStr ? JSON.parse(hydratedResponsesStr) : {};
  
  return (
    <IntrigProvider configs={configs} initState={hydratedResponses}>
      {children}
    </IntrigProvider>
  );
}
```

This means server-side function results are automatically available to client components without additional fetching.

### Integration with Middleware

IntrigLayout works seamlessly with Intrig middleware for header injection:

```tsx
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  return {
    'Authorization': `Bearer ${await getAuthToken()}`,
    'X-User-ID': request.headers.get('x-user-id') || '',
  };
});

// app/layout.tsx - configs will automatically use injected headers
<IntrigLayout configs={{ baseURL: process.env.NEXT_PUBLIC_API_URL }}>
  {children}
</IntrigLayout>
```

## Key Differences from IntrigProvider

| Feature | IntrigProvider (React) | IntrigLayout (Next.js) |
|---------|----------------------|----------------------|
| **Context** | Client-side only | Server-aware, client-ready |
| **State Hydration** | Manual initialization | Automatic from headers |
| **Configuration** | Multiple API sources supported | Single configuration object |
| **Middleware Integration** | No built-in support | Seamless header injection |
| **Server Components** | N/A | Compatible with SSR/SSG |

## Best Practices

### 1. Environment Configuration
```tsx
// Use environment variables for different deployment stages
const configs = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '5000'),
};
```

### 2. Layout Placement
```tsx
// Place IntrigLayout in your root layout for app-wide availability
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <IntrigLayout configs={...}>
      {children}
    </IntrigLayout>
  );
}
```

### 3. Server Component Compatibility
```tsx
// IntrigLayout is server-compatible and handles hydration automatically
// No additional setup needed for server components using Intrig functions
```

### 4. Error Boundary Integration
```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';
import ErrorBoundary from './components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <IntrigLayout configs={configs}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </IntrigLayout>
  );
}
```

## Advanced Usage

### Dynamic Configuration

```tsx
// app/layout.tsx with dynamic config based on headers
import { headers } from 'next/headers';
import { IntrigLayout } from '@intrig/next';

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const userRegion = headersList.get('x-user-region') || 'us';
  
  const configs = {
    baseURL: `https://api-${userRegion}.example.com`,
    timeout: 5000,
    headers: {
      'X-Region': userRegion,
    },
  };

  return (
    <IntrigLayout configs={configs}>
      {children}
    </IntrigLayout>
  );
}
```

### Integration with Authentication

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';
import { cookies } from 'next/headers';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  
  const configs = {
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
  };

  return (
    <IntrigLayout configs={configs}>
      {children}
    </IntrigLayout>
  );
}
```

## Related

- [Server Functions](/docs/next/api/server-functions) - Learn about server-side API functions
- [Stateful Hook](/docs/next/api/stateful-hook) - Understand client-side stateful hook usage
- [Middleware](/docs/next/api/middleware) - Set up request/response middleware
- [Core Concepts](/docs/next/core-concepts/server-client-architecture) - Understand the server-client architecture