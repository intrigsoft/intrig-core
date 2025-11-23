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

### Session-Based Authentication

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';
import { getSession } from '@/lib/session';

export const middleware = createIntrigMiddleware(async (request) => {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return {};
    }
    
    // Validate session hasn't expired
    if (session.expiresAt < Date.now()) {
      // Clear expired session
      const response = NextResponse.next();
      response.cookies.delete('session');
      return {};
    }
    
    return {
      'Authorization': `Bearer ${session.token}`,
      'X-Session-ID': session.id,
      'X-User-ID': session.userId,
    };
  } catch (error) {
    console.error('Session validation failed:', error);
    return {};
  }
});
```

### Rate Limiting

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export const middleware = createIntrigMiddleware(async (request) => {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limit,
        remaining: 0,
        reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }
  
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
});
```

### Request Transformation

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  const userAgent = request.headers.get('user-agent') || '';
  const clientInfo = parseUserAgent(userAgent);
  
  // Add client information headers
  const headers = {
    'X-Client-OS': clientInfo.os,
    'X-Client-Browser': clientInfo.browser,
    'X-Client-Version': clientInfo.version,
    'X-Client-Mobile': clientInfo.mobile ? 'true' : 'false',
  };
  
  // Add environment-specific headers
  if (process.env.NODE_ENV === 'development') {
    headers['X-Debug-Mode'] = 'true';
    headers['X-Debug-Timestamp'] = Date.now().toString();
  }
  
  // Add feature flags
  const featureFlags = await getFeatureFlags(request);
  if (featureFlags) {
    headers['X-Feature-Flags'] = JSON.stringify(featureFlags);
  }
  
  return headers;
});

function parseUserAgent(userAgent: string) {
  // Simple user agent parsing (use a library like ua-parser-js for production)
  const mobile = /mobile|android|iphone|ipad/i.test(userAgent);
  const chrome = /chrome/i.test(userAgent);
  const firefox = /firefox/i.test(userAgent);
  const safari = /safari/i.test(userAgent) && !chrome;
  
  return {
    mobile,
    os: mobile ? 'mobile' : 'desktop',
    browser: chrome ? 'chrome' : firefox ? 'firefox' : safari ? 'safari' : 'unknown',
    version: 'unknown', // Would extract from user agent string
  };
}

async function getFeatureFlags(request: NextRequest) {
  // Mock feature flag service
  return {
    newDashboard: true,
    advancedAnalytics: false,
  };
}
```

### Error Handling

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  try {
    // Perform middleware logic
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return {
      'Authorization': `Bearer ${authResult.token}`,
      'X-User-ID': authResult.userId,
    };
  } catch (error) {
    // Log error for monitoring
    console.error('Middleware error:', {
      error: error.message,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip,
    });
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Authentication service unavailable' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.slice(7);
  
  // Validate token with auth service
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/validate`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    return { success: false, error: 'Invalid token' };
  }
  
  const userData = await response.json();
  
  return {
    success: true,
    token,
    userId: userData.id,
  };
}
```

## Environment-Based Configuration

### Development vs Production

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const headers: Record<string, string> = {};
  
  // Development-specific headers
  if (isDevelopment) {
    headers['X-Debug-Mode'] = 'true';
    headers['X-Request-Time'] = Date.now().toString();
    headers['X-Environment'] = 'development';
    
    // Skip authentication in development
    headers['Authorization'] = 'Bearer dev-token';
  }
  
  // Production-specific headers
  if (isProduction) {
    headers['X-Environment'] = 'production';
    
    // Strict authentication in production
    const authToken = await validateProductionAuth(request);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  
  // Common headers for all environments
  headers['X-Request-ID'] = generateRequestId();
  headers['X-API-Version'] = '1.0';
  
  return headers;
});

async function validateProductionAuth(request: NextRequest): Promise<string | null> {
  // Production authentication logic
  const token = request.headers.get('authorization')?.slice(7);
  
  if (!token) {
    return null;
  }
  
  // Validate with auth service
  try {
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/validate`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    return response.ok ? token : null;
  } catch {
    return null;
  }
}
```

### Feature Flag Integration

```typescript
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  const userId = await getUserIdFromRequest(request);
  const featureFlags = await getFeatureFlags(userId);
  
  const headers = {
    'X-Feature-Flags': JSON.stringify(featureFlags),
  };
  
  // Conditionally add headers based on feature flags
  if (featureFlags.enableNewAPI) {
    headers['X-API-Version'] = '2.0';
  }
  
  if (featureFlags.enableAnalytics) {
    headers['X-Analytics-Enabled'] = 'true';
  }
  
  return headers;
});

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // Extract user ID from token
  try {
    const token = authHeader.slice(7);
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return decoded.sub;
  } catch {
    return null;
  }
}

async function getFeatureFlags(userId: string | null) {
  if (!userId) {
    return {
      enableNewAPI: false,
      enableAnalytics: false,
    };
  }
  
  // Fetch feature flags from service
  try {
    const response = await fetch(`${process.env.FEATURE_FLAG_SERVICE}/flags/${userId}`);
    return await response.json();
  } catch {
    // Return default flags on error
    return {
      enableNewAPI: false,
      enableAnalytics: false,
    };
  }
}
```

## Best Practices

### Performance Optimization

```typescript
// Cache expensive operations
const cache = new Map();

export const middleware = createIntrigMiddleware(async (request) => {
  const cacheKey = `user:${request.headers.get('authorization')}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (cached.expires > Date.now()) {
      return cached.headers;
    }
    cache.delete(cacheKey);
  }
  
  // Perform expensive operation
  const result = await expensiveAuthOperation(request);
  
  // Cache result
  cache.set(cacheKey, {
    headers: result,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  
  return result;
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