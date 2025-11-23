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

### Background Job Processing

```typescript
// app/api/jobs/process-user-data/route.ts
import { getUsers, updateUser } from '@intrig/next/userApi/users/getUsers/server';
import { updateUser as updateUserFunc } from '@intrig/next/userApi/users/updateUser/server';
import { processUserData } from '@intrig/next/analyticsApi/analytics/processUserData/server';

export async function POST() {
  try {
    const users = await getUsers({ limit: 100 });
    
    for (const user of users) {
      try {
        const analysis = await processUserData({ userId: user.id });
        await updateUserFunc({ 
          id: user.id, 
          lastAnalyzed: new Date(),
          analysisScore: analysis.score 
        });
      } catch (userError) {
        console.error(`Failed to process user ${user.id}:`, userError);
        // Continue processing other users
      }
    }
    
    return Response.json({ processed: users.length });
  } catch (error) {
    return Response.json({ error: 'Job failed' }, { status: 500 });
  }
}
```

## Characteristics

### No State Management

Unlike client hooks, server functions don't use global state management. Each function call is independent and stateless.

```typescript
// ✅ Server function - stateless
import { getUser } from '@intrig/next/userApi/users/getUser/server';

export async function GET() {
  // Each call is independent
  const user1 = await getUser({ id: '1' });
  const user2 = await getUser({ id: '2' });
  
  return Response.json({ user1, user2 });
}

// ❌ No persistent state between calls
// Server functions don't maintain state like client hooks do
```

### Direct Backend Access

Server functions run in Node.js and can directly access:

```typescript
// app/api/users/profile/route.ts
import { getUser } from '@intrig/next/userApi/users/getUser/server';
import { db } from '@/lib/database';
import { s3 } from '@/lib/storage';
import fs from 'fs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');
  
  try {
    // Direct API access
    const user = await getUser({ id: userId });
    
    // Direct database access
    const preferences = await db.userPreferences.findUnique({
      where: { userId }
    });
    
    // Direct file system access
    const configFile = await fs.promises.readFile('./config.json', 'utf8');
    const config = JSON.parse(configFile);
    
    // Direct cloud storage access
    const profileImage = await s3.getSignedUrl('getObject', {
      Bucket: 'user-profiles',
      Key: `${userId}/avatar.jpg`
    });
    
    return Response.json({
      user,
      preferences,
      profileImageUrl: profileImage,
      config: config.userDefaults
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Error Handling

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

### Retry Logic

```typescript
// app/lib/retry-wrapper.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// Usage in API route
import { getUser } from '@intrig/next/userApi/users/getUser/server';
import { withRetry } from '@/lib/retry-wrapper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');
  
  try {
    const user = await withRetry(() => getUser({ id: userId }));
    return Response.json(user);
  } catch (error) {
    return Response.json({ error: 'Failed after retries' }, { status: 500 });
  }
}
```

## Performance Optimization

### Caching Strategies

```typescript
// app/api/users/[id]/route.ts
import { getUser } from '@intrig/next/userApi/users/getUser/server';
import { unstable_cache } from 'next/cache';

// Cache user data for 5 minutes
const getCachedUser = unstable_cache(
  async (id: string) => getUser({ id }),
  ['user'],
  { revalidate: 300 }
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCachedUser(params.id);
    return Response.json(user);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Parallel Processing

```typescript
// app/api/users/[id]/complete-profile/route.ts
import { getUser } from '@intrig/next/userApi/users/getUser/server';
import { getUserPosts } from '@intrig/next/userApi/users/getUserPosts/server';
import { getUserFollowers } from '@intrig/next/userApi/users/getUserFollowers/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch all data in parallel
    const [user, posts, followers] = await Promise.allSettled([
      getUser({ id: params.id }),
      getUserPosts({ userId: params.id }),
      getUserFollowers({ userId: params.id })
    ]);
    
    return Response.json({
      user: user.status === 'fulfilled' ? user.value : null,
      posts: posts.status === 'fulfilled' ? posts.value : [],
      followers: followers.status === 'fulfilled' ? followers.value : [],
      errors: [user, posts, followers]
        .filter(result => result.status === 'rejected')
        .map(result => result.reason.message)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Generated File Structure

Server functions are generated in the following structure:

```
src/
├── [source]/                     # e.g., userApi/
│   ├── [controller]/             # e.g., users/
│   │   └── [operationId]/        # e.g., getUser/
│   │       ├── server.ts         # exports: getUser, executeGetUser
│   │       ├── getUser.ts        # actual function implementations
│   │       └── GetUser.params.ts # shared parameter types
│   └── components/schemas/       # shared response/request types
```

## Import Patterns

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