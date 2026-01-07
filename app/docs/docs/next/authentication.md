# Authentication

Next.js authentication uses middleware to inject headers into server function calls. This approach works with any authentication system and enables consistent auth handling across client and server boundaries.

## Architecture Overview

```
Request ──► Middleware ──► Route/Server Function ──► External API
                │                    │
         (injects headers)    (reads headers)
```

Key components:
- `createIntrigMiddleware` — middleware factory for header injection
- `getHeaders` — retrieves injected headers in server functions
- Environment variables — configure API base URLs

## Generated Utilities

Intrig generates `intrig-middleware.ts` with these exports:

```typescript
// Middleware factory
function createIntrigMiddleware(
  headersFunction: (request: NextRequest) => Promise<Record<string, string>>
): (request: NextRequest) => Promise<NextResponse>;

// Header retrieval for server functions
async function getHeaders(): Promise<Record<string, string>>;

// Axios instance factory (uses {SOURCE}_API_URL env var)
async function getAxiosInstance(key: string): Promise<AxiosInstance>;
```

## Environment Configuration

Configure API base URLs via environment variables:

```bash
# .env.local
EMPLOYEE_API_API_URL=https://api.example.com
PAYMENTS_API_API_URL=https://payments.example.com
```

Naming convention: `{SOURCE_NAME}_API_URL` (uppercase, underscores)

## Middleware Setup

Create your middleware using `createIntrigMiddleware`:

```typescript
// middleware.ts
import { createIntrigMiddleware } from './intrig-middleware';
import { auth } from './auth'; // Your auth config

const intrigMiddleware = createIntrigMiddleware(async (request) => {
  const session = await auth();

  if (session?.accessToken) {
    return {
      Authorization: `Bearer ${session.accessToken}`,
    };
  }

  return {};
});

export async function middleware(request: NextRequest) {
  return intrigMiddleware(request);
}

export const config = {
  matcher: '/api/:path*',
};
```

The middleware:
1. Receives your headers function
2. Calls it with the incoming request
3. Prefixes each header key with `intrig-`
4. Attaches to the request for downstream consumption

## NextAuth Integration

### Auth.js (NextAuth v5)

```typescript
// middleware.ts
import { auth } from '@/auth';
import { createIntrigMiddleware } from './intrig-middleware';

const intrigMiddleware = createIntrigMiddleware(async (request) => {
  const session = await auth();

  return {
    Authorization: session?.accessToken
      ? `Bearer ${session.accessToken}`
      : '',
    'X-User-Id': session?.user?.id ?? '',
  };
});

export default async function middleware(request: NextRequest) {
  return intrigMiddleware(request);
}
```

### NextAuth v4

```typescript
// middleware.ts
import { getToken } from 'next-auth/jwt';
import { createIntrigMiddleware } from './intrig-middleware';

const intrigMiddleware = createIntrigMiddleware(async (request) => {
  const token = await getToken({ req: request });

  return {
    Authorization: token?.accessToken
      ? `Bearer ${token.accessToken}`
      : '',
  };
});

export default async function middleware(request: NextRequest) {
  return intrigMiddleware(request);
}
```

## Server-Side Header Access

Server functions automatically receive injected headers. For custom server-side logic, use `getHeaders`:

```typescript
// In a Server Component or Server Action
import { getHeaders } from '@/intrig-middleware';

export async function myServerAction() {
  const headers = await getHeaders();
  // headers contains: { Authorization: 'Bearer ...', 'X-User-Id': '...' }
  // (without the 'intrig-' prefix)
}
```

## Multiple Auth Schemes

For different auth per API source, return different headers based on the request path:

```typescript
const intrigMiddleware = createIntrigMiddleware(async (request) => {
  const session = await auth();
  const path = request.nextUrl.pathname;

  // Internal API — user token
  if (path.startsWith('/api/(generated)/internal_api')) {
    return {
      Authorization: `Bearer ${session?.accessToken}`,
    };
  }

  // Vendor API — API key from env
  if (path.startsWith('/api/(generated)/vendor_api')) {
    return {
      'X-API-Key': process.env.VENDOR_API_KEY!,
    };
  }

  // Public API — no auth
  return {};
});
```

## API Key Authentication

For APIs using static API keys (no user context):

```typescript
const intrigMiddleware = createIntrigMiddleware(async () => {
  return {
    'X-API-Key': process.env.API_KEY!,
  };
});
```

## Custom Headers

Pass any headers through the middleware:

```typescript
const intrigMiddleware = createIntrigMiddleware(async (request) => {
  const session = await auth();

  return {
    Authorization: `Bearer ${session?.accessToken}`,
    'X-Tenant-Id': session?.tenantId,
    'X-Request-Id': crypto.randomUUID(),
    'Accept-Language': request.headers.get('Accept-Language') ?? 'en',
  };
});
```

## Combining with Other Middleware

Chain Intrig middleware with other middleware:

```typescript
// middleware.ts
import { createIntrigMiddleware } from './intrig-middleware';
import { auth } from './auth';

const intrigMiddleware = createIntrigMiddleware(async () => {
  const session = await auth();
  return {
    Authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
  };
});

export async function middleware(request: NextRequest) {
  // Your custom logic first
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Then Intrig middleware for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return intrigMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
```

## Server Components

For Server Components that call server functions directly (not through routes), headers are still available if the request went through middleware:

```typescript
// app/dashboard/page.tsx
import { getEmployee } from '@intrig/next/employee_api/employees/getEmployee';

export default async function DashboardPage() {
  // Server function automatically uses headers injected by middleware
  const { data: employee } = await getEmployee({ id: 'current' });

  return <Dashboard employee={employee} />;
}
```

## Troubleshooting

**Headers not reaching server functions:**
- Verify middleware matcher includes your API routes
- Check that `intrig-` prefixed headers are being set (inspect in dev tools)

**Environment variable not found:**
- Ensure variable follows `{SOURCE_NAME}_API_URL` convention
- Verify it's set in `.env.local` (not just `.env` for sensitive values)

**Auth token undefined:**
- Confirm auth session contains the expected token field
- Check that auth middleware runs before Intrig middleware

## Related

- [Middleware API](./api/middleware.md) — Middleware reference
- [React Authentication](../react/authentication.md) — React-specific auth patterns
