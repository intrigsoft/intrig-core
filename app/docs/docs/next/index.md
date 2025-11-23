# Next.js Integration

Intrig's Next.js integration provides type-safe server functions and client hooks for full-stack API integration. This section documents the framework-specific implementation, server-client architecture, and Next.js App Router patterns.

## Documentation Structure

---

### Core Concepts

Framework-specific architectural patterns for Next.js integration.

**Topics covered:**
- Server-client architecture and separation of concerns
- Server-side functions for API routes and Server Actions
- Client-side hooks for interactive components
- Middleware integration for request preprocessing
- Configuration management across environments

[View Core Concepts →](./core-concepts)

---

### API Reference

Complete technical specification for Next.js-specific components, functions, and utilities.

**Server-side:**
- IntrigLayout configuration
- Server functions and actions
- Middleware utilities

**Client-side:**
- Stateful and stateless hooks
- NetworkState and type guards
- Download hooks for file operations

[View API Reference →](./api)

---

### Tutorial

Step-by-step implementation guide for Next.js integration scenarios.

**Tutorial topics:**
- App Router setup and configuration
- Server-side data fetching patterns
- Client-side state management
- Authentication and middleware

[View Tutorial →](./tutorial/basic-application)

---

### Cookbook

Practical patterns and implementation strategies for common Next.js scenarios.

**Patterns covered:**
- Server/client data synchronization
- Caching strategies
- Middleware patterns
- Performance optimization

[View Cookbook →](./cookbook/server-client-data-flow)

---

### Known Pitfalls

Common issues and prevention strategies specific to Next.js.

**Pitfalls documented:**
- Hydration mismatches
- Server/client state synchronization
- Memory leaks in server components
- Performance bottlenecks

[View Known Pitfalls →](./known-pitfalls/hydration-mismatch)

---

## Integration Overview

Next.js integration consists of server and client components:

**Server-Side**: Server functions for API routes, Server Actions, and server components. Environment variable configuration with automatic request preprocessing through middleware.

**Client-Side**: React hooks with NetworkState management, integrated with Next.js hydration patterns for seamless server-to-client transitions.

**Middleware Layer**: Edge middleware for authentication, header injection, and request preprocessing before server functions execute.

---

## Quick Reference

### Server Function Usage

```tsx
// app/api/users/route.ts
import { getUserAction } from '@intrig/next/userApi/users/getUser/action';

export async function GET() {
  const user = await getUserAction({ id: '123' });
  return Response.json(user);
}
```

### Client Hook Usage

```tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { isSuccess, isPending } from '@intrig/next';

function UserProfile({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser({
    fetchOnMount: true,
    params: { id: userId }
  });

  if (isPending(userState)) return <Loading />;
  if (isSuccess(userState)) return <Profile user={userState.data} />;
  return null;
}
```

### Middleware Configuration

```tsx
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  };
});

export const config = { matcher: '/api/:path*' };
```

---

## Next Steps

**New to Intrig**: Start with [Core Concepts](./core-concepts/server-client-architecture) to understand the architecture.

**Implementing Integration**: Reference [API Documentation](./api/intrig-layout) for configuration details.

**Building Features**: Follow the [Tutorial](./tutorial/basic-application) for practical examples.