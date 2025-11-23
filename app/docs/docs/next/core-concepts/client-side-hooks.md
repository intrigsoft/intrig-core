# Client-Side Hooks

Client-side hooks manage state and user interactions in Next.js applications, optimized for hydration and server-side rendering scenarios.

## Overview

Intrig's client-side hooks provide reactive state management in the browser environment with:

- **Hydration optimization** for smooth server-to-client transitions
- **Multiple hook variants** for different use cases
- **Type-safe state management** with loading, error, and data states
- **Real-time capabilities** through Server-Sent Events
- **Performance optimization** with automatic caching and deduplication

## Hook Types

### Stateful Hooks

Stateful hooks provide comprehensive state management with loading, error, and data states, ideal for most interactive use cases.

```tsx
// app/components/UserProfile.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useEffect } from 'react';

export function UserProfile({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser();

  useEffect(() => {
    getUser({ id: userId });
  }, [userId, getUser]);

  // State includes: loading, error, data, lastFetched
  const { loading, error, data, lastFetched } = userState;

  if (loading && !data) {
    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error loading user: {error.message}</p>
        <button onClick={() => getUser({ id: userId })}>
        Try Again
        </button>
      </div>
  );
  }

  if (!data) {
    return <div>No user found</div>;
  }

  return (
    <div className="user-profile">
    <img src={data.avatar} alt={`${data.name}'s avatar`} />
    <h2>{data.name}</h2>
    <p>{data.email}</p>
    <small>Last updated: {lastFetched?.toLocaleString()}</small>
    <button onClick={() => getUser({ id: userId })}>
      Refresh
    </button>
  </div>
);
}
```

### Stateless Hooks

Stateless hooks provide function-only access without built-in state management, giving you complete control over state handling.

```tsx
// app/components/UserActions.tsx
'use client';
import { useGetUserAsync } from '@intrig/next/userApi/users/getUser/client';
import { useUpdateUserAsync } from '@intrig/next/userApi/users/updateUser/client';
import { useState } from 'react';

export function UserActions({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [getUser] = useGetUserAsync();
  const [updateUser] = useUpdateUserAsync();
  
  const handleFetchUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await getUser({ id: userId });
      setUser(userData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedUser = await updateUser({ id: user.id, ...updates });
      setUser(updatedUser);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetchUser} disabled={loading}>
        {loading ? 'Loading...' : 'Load User'}
      </button>
      
      {user && (
        <div>
          <p>{user.name} - {user.email}</p>
          <button 
            onClick={() => handleUpdateUser({ name: 'Updated Name' })}
            disabled={loading}
          >
            Update Name
          </button>
        </div>
      )}
      
      {error && <p className="error">Error: {error.message}</p>}
    </div>
  );
}
```

### Server-Sent Events (SSE) Hooks

SSE hooks enable real-time data streaming from the server for live updates.

```tsx
// app/components/LiveUserData.tsx
'use client';
import { useGetUserSSE } from '@intrig/next/userApi/users/getUser/client';
import { useEffect } from 'react';

export function LiveUserData({ userId }: { userId: string }) {
  const [state, startStream, stopStream] = useGetUserSSE();
  
  useEffect(() => {
    // Start streaming when component mounts
    startStream({ id: userId });
    
    // Cleanup on unmount
    return () => stopStream();
  }, [userId, startStream, stopStream]);

  return (
    <div className="live-user-data">
      <div className="connection-status">
        Status: {state.connected ? 'Connected' : 'Disconnected'}
        {state.connecting && ' (Connecting...)'}
      </div>
      
      {state.error && (
        <div className="error">
          Connection error: {state.error.message}
          <button onClick={() => startStream({ id: userId })}>
            Reconnect
          </button>
        </div>
      )}
      
      {state.data && (
        <div className="user-data">
          <h3>Live User Data</h3>
          <p>Name: {state.data.name}</p>
          <p>Status: {state.data.status}</p>
          <p>Last Activity: {state.data.lastActivity}</p>
        </div>
      )}
      
      <div className="controls">
        <button onClick={() => startStream({ id: userId })}>
          Start Stream
        </button>
        <button onClick={stopStream}>
          Stop Stream
        </button>
      </div>
    </div>
  );
}
```

## Generated Hook Structure

Client hooks are generated in the following structure:

```
src/
├── [source]/                     # e.g., userApi/
│   ├── [controller]/             # e.g., users/
│   │   └── [operationId]/        # e.g., getUser/
│   │       ├── client.ts         # exports: useGetUser, useGetUserAsync
│   │       ├── useGetUser.ts     # stateful hook
│   │       ├── useGetUserAsync.ts # stateless hook
│   │       └── GetUser.params.ts # shared parameter types
│   └── components/schemas/       # shared response/request types
```

## Hydration Optimization

Client hooks are specifically optimized for Next.js hydration patterns to prevent mismatches and ensure smooth transitions.

### Preventing Hydration Mismatches

```tsx
// app/components/HydratedUserProfile.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useState, useEffect } from 'react';

export function HydratedUserProfile({ 
  initialUser, 
  userId 
}: { 
  initialUser?: User; 
  userId: string; 
}) {
  const [isClient, setIsClient] = useState(false);
  const [userState, getUser] = useGetUser();
  
  useEffect(() => {
    setIsClient(true);
    
    // Only fetch if no initial data provided
    if (!initialUser) {
      getUser({ id: userId });
    }
  }, [userId, getUser, initialUser]);

  // Prevent hydration mismatch by using consistent rendering
  if (!isClient) {
    return initialUser ? (
      <UserDisplay user={initialUser} />
    ) : (
      <UserProfileSkeleton />
    );
  }
  
  // After hydration, use client state
  if (userState.loading && !userState.data && !initialUser) {
    return <UserProfileSkeleton />;
  }
  
  if (userState.error) {
    return <ErrorDisplay error={userState.error} />;
  }
  
  // Use client data if available, fallback to initial data
  const user = userState.data || initialUser;
  
  return user ? <UserDisplay user={user} /> : <div>No user found</div>;
}
```

### Basic Hook Imports

```tsx
// From consolidated client export
import { useGetUser, useGetUserAsync } from '@intrig/next/userApi/users/getUser/client';

// Or directly from specific hook files
import { useGetUser } from '@intrig/next/userApi/users/getUser/useGetUser';
import { useGetUserAsync } from '@intrig/next/userApi/users/getUser/useGetUserAsync';
```

### Type Imports

```tsx
// Parameter types (shared with server)
import type { GetUserParams } from '@intrig/next/userApi/users/getUser/GetUser.params';

// Response types
import type { User } from '@intrig/next/userApi/components/schemas/User';
import type { UpdateUserRequest } from '@intrig/next/userApi/components/schemas/UpdateUserRequest';
```

### Multiple Hook Imports

```tsx
// Multiple operations from different controllers
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useCreateUser } from '@intrig/next/userApi/users/createUser/client';
import { useUpdateUser } from '@intrig/next/userApi/users/updateUser/client';
```

Client-side hooks provide powerful, flexible state management capabilities that work seamlessly with Next.js's server-side rendering and hydration patterns, enabling rich interactive user experiences.