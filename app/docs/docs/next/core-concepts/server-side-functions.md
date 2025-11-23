# Server-Side Functions

Server-side functions provide direct backend access within Next.js API routes and server components without client-side state management overhead.

## Overview

Intrig generates server-side functions that run in Node.js environments, offering:

- **Direct API access** without client-side state complexity
- **Automatic configuration** using environment variables
- **Type-safe operations** with full TypeScript support
- **Error handling** optimized for server environments
- **No state management** - each function call is independent

## Function Types

Intrig generates two types of server functions for each API operation:

### Action Functions (High-level)

Action functions provide simplified interfaces with automatic error handling and response parsing.

```typescript
// app/api/users/route.ts
import { createUser, updateUser, deleteUser } from '@intrig/next/userApi/users/createUser/server';
import { updateUser as updateUserFunc } from '@intrig/next/userApi/users/updateUser/server';
import { deleteUser as deleteUserFunc } from '@intrig/next/userApi/users/deleteUser/server';

export async function POST(request: Request) {
  const userData = await request.json();
  
  try {
    const newUser = await createUser(userData);
    return Response.json(newUser, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const { id, ...updates } = await request.json();
  
  try {
    const updatedUser = await updateUserFunc({ id, ...updates });
    return Response.json(updatedUser);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  try {
    await deleteUserFunc({ id });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

### Execute Functions (Low-level)

Execute functions provide access to raw response data and headers for advanced use cases.

```typescript
// app/users/[id]/page.tsx
import { executeGetUser } from '@intrig/next/userApi/users/getUser/server';
import { executeGetUserPosts } from '@intrig/next/userApi/users/getUserPosts/server';

export default async function UserPage({ params }: { params: { id: string } }) {
  try {
    // Parallel data fetching with raw response access
    const [userResponse, postsResponse] = await Promise.all([
      executeGetUser({ id: params.id }),
      executeGetUserPosts({ userId: params.id })
    ]);
    
    return (
      <div>
        <UserProfile 
          user={userResponse.data} 
          lastModified={userResponse.headers['last-modified']} 
        />
        <UserPosts 
          posts={postsResponse.data}
          totalCount={postsResponse.headers['x-total-count']} 
        />
      </div>
    );
  } catch (error) {
    return <ErrorPage error={error} />;
  }
}
```

## Usage Patterns

### API Route Implementation

```typescript
// app/api/users/search/route.ts
import { searchUsers } from '@intrig/next/userApi/users/searchUsers/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  if (!query) {
    return Response.json({ error: 'Query parameter required' }, { status: 400 });
  }
  
  try {
    const results = await searchUsers({ 
      query, 
      limit: Math.min(limit, 50) // Prevent excessive results
    });
    
    return Response.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return Response.json(
      { error: 'Search failed' }, 
      { status: 500 }
    );
  }
}
```

### Server Component Data Fetching

```typescript
// app/dashboard/page.tsx
import { getCurrentUser, getUserStats } from '@intrig/next/userApi/users/getCurrentUser/server';
import { getUserStats as getStatsFunc } from '@intrig/next/userApi/users/getUserStats/server';
import { getRecentOrders } from '@intrig/next/orderApi/orders/getRecentOrders/server';

export default async function DashboardPage() {
  try {
    const user = await getCurrentUser();
    
    // Fetch user-specific data in parallel
    const [stats, recentOrders] = await Promise.all([
      getStatsFunc({ userId: user.id }),
      getRecentOrders({ userId: user.id, limit: 5 })
    ]);
    
    return (
      <div>
        <h1>Welcome back, {user.name}!</h1>
        <DashboardStats stats={stats} />
        <RecentActivity orders={recentOrders} />
      </div>
    );
  } catch (error) {
    return <div>Unable to load dashboard. Please try again.</div>;
  }
}
```

### Comprehensive Error Handling

```typescript
// app/api/users/route.ts
import { createUser } from '@intrig/next/userApi/users/createUser/server';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = createUserSchema.parse(body);
    
    // Call server function
    const user = await createUser(validatedData);
    
    return Response.json(user, { status: 201 });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          error: 'Validation failed', 
          details: error.errors 
        }, 
        { status: 400 }
      );
    }
    
    // Handle API errors
    if (error.status) {
      return Response.json(
        { error: error.message }, 
        { status: error.status }
      );
    }
    
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### Basic Server Function Imports

```typescript
// From consolidated server export
import { getUser, executeGetUser } from '@intrig/next/userApi/users/getUser/server';

// Or directly from function file
import { getUser, executeGetUser } from '@intrig/next/userApi/users/getUser/getUser';
```

### Type Imports

```typescript
// Parameter types (shared with client)
import type { GetUserParams } from '@intrig/next/userApi/users/getUser/GetUser.params';

// Response types
import type { User } from '@intrig/next/userApi/components/schemas/User';
import type { CreateUserRequest } from '@intrig/next/userApi/components/schemas/CreateUserRequest';
```

### Multiple Function Imports

```typescript
// Multiple operations from same controller
import { 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser 
} from '@intrig/next/userApi/users/getUser/server';

// Or individual imports for clarity
import { getUser } from '@intrig/next/userApi/users/getUser/server';
import { createUser } from '@intrig/next/userApi/users/createUser/server';
import { updateUser } from '@intrig/next/userApi/users/updateUser/server';
```

Server-side functions provide the foundation for robust, scalable Next.js applications by offering direct backend access while maintaining type safety and error handling best practices.