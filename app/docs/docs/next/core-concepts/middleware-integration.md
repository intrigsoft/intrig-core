# Middleware Integration

Next.js middleware enhanced with Intrig enables centralized request processing at the edge before requests reach API routes or server components.

## Overview

Intrig middleware provides a powerful way to intercept and modify requests at the edge, offering:

- **Authentication header injection** for seamless API access
- **Rate limiting** to protect your APIs
- **Request transformation** for consistent data flow
- **Error handling** at the edge level
- **Environment-based behavior** for different deployment stages

## Creating Intrig Middleware

### Basic Middleware Setup

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  // Return headers to be added to all Intrig requests
  return {
    'X-Request-ID': generateRequestId(),
    'X-Timestamp': new Date().toISOString(),
  };
});

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Advanced Middleware Configuration

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';
import { NextRequest, NextResponse } from 'next/server';

export const middleware = createIntrigMiddleware(async (request: NextRequest) => {
  const response = NextResponse.next();
  
  // Get user information from request
  const authToken = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent');
  const ip = request.ip || request.headers.get('x-forwarded-for');
  
  // Add tracking headers
  const headers = {
    'X-User-IP': ip || 'unknown',
    'X-User-Agent': userAgent || 'unknown',
    'X-Request-Path': request.nextUrl.pathname,
  };
  
  // Add auth headers if available
  if (authToken) {
    headers['Authorization'] = authToken;
  }
  
  return headers;
});

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};
```

## Common Use Cases

### Authentication Header Injection

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';
import { getToken } from 'next-auth/jwt';

export const middleware = createIntrigMiddleware(async (request) => {
  // Get authentication token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    // Redirect unauthenticated users for protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return Response.redirect(loginUrl);
    }
    
    return {}; // No headers for unauthenticated requests
  }
  
  return {
    'Authorization': `Bearer ${token.accessToken}`,
    'X-User-ID': token.sub,
    'X-User-Role': token.role,
  };
});
```

### Error Recovery

```typescript
export const middleware = createIntrigMiddleware(async (request) => {
  try {
    return await primaryAuthService(request);
  } catch (error) {
    console.warn('Primary auth service failed, falling back:', error.message);
    
    try {
      return await fallbackAuthService(request);
    } catch (fallbackError) {
      console.error('Both auth services failed:', fallbackError.message);
      
      // Return minimal headers to allow request to proceed
      return {
        'X-Auth-Status': 'degraded',
        'X-Error': 'Auth service unavailable',
      };
    }
  }
});
```

Intrig middleware provides a powerful foundation for building secure, scalable Next.js applications with centralized request processing and enhanced API integration capabilities.