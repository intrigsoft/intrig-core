# Server Functions

**Server Functions** are async functions specifically designed for Next.js server-side environments. They provide direct backend API access without client-side state management overhead, making them ideal for API routes, server components, and server actions.

## Overview

Server Functions in Intrig come in two variants that serve different use cases:
- **Action Functions** - High-level functions with automatic error handling, response parsing, and type safety
- **Execute Functions** - Lower-level functions that return raw response data and headers for advanced use cases
- **Environment Integration** - Seamless integration with Next.js middleware and environment variables
- **Hydration Support** - Optional client-side state hydration for server-rendered data
- **Type Safety** - Full TypeScript support with generated types from your API specifications

## Function Types

### Action Functions

Action functions are the primary way to interact with APIs from server-side code. They handle response parsing, validation, and error handling automatically.

**Naming Convention:** `{operationName}Action` (e.g., `getUserAction`, `createProductAction`)

**Type Signature:**
```tsx
function {operationName}Action(
  body?: RequestBody,
  params?: Params,
  options?: AsyncRequestOptions
): Promise<ResponseType>
```

### Execute Functions

Execute functions provide lower-level access with raw response data and headers, useful when you need access to response metadata.

**Naming Convention:** `execute{OperationName}` (e.g., `executeGetUser`, `executeCreateProduct`)

**Type Signature:**
```tsx
function execute{OperationName}(
  body?: RequestBody,
  params?: Params,
  options?: AsyncRequestOptions
): Promise<{ data: any, headers: Record<string, string> }>
```

## Basic Usage

### Action Functions - Simple API Calls

```tsx
// app/api/users/route.ts
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';

export async function GET(request: Request) {
  try {
    const user = await getUserAction({ id: '123' });
    return Response.json(user);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Execute Functions - Raw Response Access

```tsx
// app/api/users/route.ts
import { executeGetUser } from '@intrig/next/server/userApi/getUser/execute';

export async function GET(request: Request) {
  try {
    const { data, headers } = await executeGetUser({ id: '123' });
    
    return Response.json(data, {
      headers: {
        'X-Cache-Status': headers['x-cache-status'] || 'miss',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Server Components

```tsx
// app/dashboard/page.tsx
import { getUserAction, getOrdersAction } from '@intrig/next/server';

interface DashboardPageProps {
  params: { userId: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  try {
    // Parallel data fetching
    const [user, orders] = await Promise.all([
      getUserAction({ id: params.userId }),
      getOrdersAction({ userId: params.userId }),
    ]);

    return (
      <div>
        <h1>Welcome, {user.name}</h1>
        <div>
          <h2>Recent Orders</h2>
          {orders.map(order => (
            <div key={order.id}>{order.title}</div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }
}
```

## Advanced Configuration

### AsyncRequestOptions

Both action and execute functions accept an optional `options` parameter:

```tsx
interface AsyncRequestOptions {
  hydrate?: boolean;  // Cache response for client-side hydration
  key?: string;      // Custom cache key (when hydrate is true)
}
```

### Hydration for Client-Side Access

```tsx
// app/profile/page.tsx - Server Component
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';

export default async function ProfilePage({ params }) {
  // Fetch data on server and make it available to client
  const user = await getUserAction(
    { id: params.userId },
    { 
      hydrate: true,
      key: `user-${params.userId}` 
    }
  );

  return (
    <div>
      <h1>{user.name}</h1>
      <ClientProfile userId={params.userId} />
    </div>
  );
}
```

```tsx
// components/ClientProfile.tsx - Client Component
'use client';
import { useGetUser } from '@intrig/next/client/userApi/getUser/useStateful';

export function ClientProfile({ userId }) {
  // This will use the hydrated data from the server
  const [userState] = useGetUser({ 
    key: `user-${userId}`,
    fetchOnMount: false // Don't fetch, use hydrated data
  });

  // Client-side interactions can now access the same data
  return (
    <button onClick={() => updateUser()}>
      Update {userState.data?.name}
    </button>
  );
}
```

### Error Handling Patterns

```tsx
// app/api/users/route.ts
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';
import { isAxiosError } from 'axios';

export async function GET(request: Request) {
  try {
    const user = await getUserAction({ id: '123' });
    return Response.json(user);
  } catch (error) {
    if (isAxiosError(error)) {
      // Handle HTTP errors
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || 'API Error';
      
      return Response.json(
        { error: message },
        { status }
      );
    } else if (error instanceof Error && error.name === 'ValidationError') {
      // Handle validation errors
      return Response.json(
        { error: 'Invalid response format' },
        { status: 502 }
      );
    } else {
      // Handle unexpected errors
      console.error('Unexpected error:', error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}
```

## Integration Patterns

### With Middleware Headers

```tsx
// app/api/protected/route.ts
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';
import { getHeaders } from '@intrig/next';

export async function GET() {
  const headers = await getHeaders();
  const userId = headers['X-User-ID'];
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // User ID is automatically available from middleware
    const user = await getUserAction({ id: userId });
    return Response.json(user);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Server Actions (App Router)

```tsx
// app/actions.ts
'use server';

import { createUserAction, updateUserAction } from '@intrig/next/server';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  try {
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    const user = await createUserAction(userData);
    
    // Revalidate the users page
    revalidatePath('/users');
    
    return { success: true, user };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    const updates = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    const user = await updateUserAction(
      updates,
      { id: userId }
    );
    
    revalidatePath(`/users/${userId}`);
    
    return { success: true, user };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}
```

### Pages Router API Routes

```tsx
// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserAction, updateUserAction, deleteUserAction } from '@intrig/next/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const user = await getUserAction({ id });
        return res.status(200).json(user);

      case 'PUT':
        const updatedUser = await updateUserAction(req.body, { id });
        return res.status(200).json(updatedUser);

      case 'DELETE':
        await deleteUserAction({ id });
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Environment-Based Configuration

```tsx
// Server functions automatically use environment variables
// .env.local
// USERS_API_URL=https://api.users.com
// PRODUCTS_API_URL=https://api.products.com

// app/api/multi-source/route.ts
import { getUserAction } from '@intrig/next/server/usersApi/getUser/action';
import { getProductAction } from '@intrig/next/server/productsApi/getProduct/action';

export async function GET() {
  try {
    // Each function uses its respective API endpoint
    const [user, product] = await Promise.all([
      getUserAction({ id: '123' }),      // Uses USERS_API_URL
      getProductAction({ id: '456' }),   // Uses PRODUCTS_API_URL
    ]);

    return Response.json({ user, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Type Safety

### Generated Types

Intrig generates TypeScript types for all server functions based on your API specifications:

```tsx
// Generated types are available for import
import type { 
  GetUserParams,
  GetUserResponse,
  CreateUserRequestBody,
  CreateUserResponse 
} from '@intrig/next/server/userApi/types';

// Use in your application code
function processUser(user: GetUserResponse): string {
  return `User: ${user.name} (${user.email})`;
}

async function createNewUser(userData: CreateUserRequestBody) {
  return await createUserAction(userData);
}
```

### Request/Response Validation

Server functions automatically validate responses against generated schemas:

```tsx
// app/api/validated/route.ts
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';

export async function GET() {
  try {
    // Response is automatically validated against the schema
    const user = await getUserAction({ id: '123' });
    
    // TypeScript knows the exact shape of user
    console.log(user.name);     // ✅ Type-safe
    console.log(user.email);    // ✅ Type-safe
    console.log(user.invalid);  // ❌ TypeScript error
    
    return Response.json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Handle schema validation errors
      return Response.json(
        { error: 'Invalid API response format' },
        { status: 502 }
      );
    }
    throw error;
  }
}
```

## Performance Considerations

### Parallel Requests

```tsx
// app/dashboard/page.tsx
export default async function Dashboard() {
  // Fetch multiple resources in parallel
  const [user, orders, notifications] = await Promise.allSettled([
    getUserAction({ id: 'current' }),
    getOrdersAction({ limit: 10 }),
    getNotificationsAction({ unread: true }),
  ]);

  return (
    <div>
      {user.status === 'fulfilled' && (
        <UserProfile user={user.value} />
      )}
      
      {orders.status === 'fulfilled' && (
        <OrdersList orders={orders.value} />
      )}
      
      {notifications.status === 'fulfilled' && (
        <NotificationsList notifications={notifications.value} />
      )}
    </div>
  );
}
```

### Response Caching

```tsx
// app/api/cached/route.ts
import { getUserAction } from '@intrig/next/server/userApi/getUser/action';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    const user = await getUserAction({ id: userId });
    
    return Response.json(user, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Enable static generation for predictable routes
export const revalidate = 300; // Revalidate every 5 minutes
```

## Error Types

Server functions can throw several types of errors:

### Network Errors
```tsx
// HTTP errors, connection issues, timeouts
catch (error) {
  if (isAxiosError(error)) {
    console.log('HTTP Status:', error.response?.status);
    console.log('Response:', error.response?.data);
  }
}
```

### Validation Errors
```tsx
// Response doesn't match expected schema
catch (error) {
  if (error.name === 'ValidationError') {
    console.log('Schema validation failed:', error.message);
  }
}
```

### Configuration Errors
```tsx
// Missing environment variables or invalid config
catch (error) {
  if (error.message.includes('API_URL is not defined')) {
    console.log('Environment configuration error');
  }
}
```

## Best Practices

### 1. Error Boundary Pattern
```tsx
async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
}

// Usage
const user = await safeApiCall(
  () => getUserAction({ id: '123' }),
  { name: 'Unknown User', email: '' }
);
```

### 2. Request Timeout Configuration
```tsx
// Configure timeouts via environment or middleware
const user = await getUserAction(
  { id: '123' },
  { timeout: 5000 }
);
```

### 3. Retry Logic
```tsx
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const user = await withRetry(
  () => getUserAction({ id: '123' })
);
```

### 4. Environment Separation
```tsx
// .env.local
NODE_ENV=development
USERS_API_URL=http://localhost:8080
DEBUG_API_CALLS=true

// .env.production
NODE_ENV=production
USERS_API_URL=https://api.production.com
DEBUG_API_CALLS=false
```

## Related

- [IntrigLayout](/docs/next/api/intrig-layout) - Learn about client-side layout configuration
- [Middleware](/docs/next/api/middleware) - Understand header injection and preprocessing
- [Stateful Hook](/docs/next/api/stateful-hook) - Compare with client-side data fetching
- [Core Concepts: Server-Client Architecture](/docs/next/core-concepts/server-client-architecture) - Architectural overview