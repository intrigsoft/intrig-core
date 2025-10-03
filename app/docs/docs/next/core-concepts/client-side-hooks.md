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

### Progressive Enhancement

```tsx
// app/components/EnhancedUserProfile.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useUpdateUser } from '@intrig/next/userApi/users/updateUser/client';
import { useState } from 'react';

export function EnhancedUserProfile({ 
  initialUser 
}: { 
  initialUser: User; 
}) {
  const [optimisticUser, setOptimisticUser] = useState(initialUser);
  const [userState, getUser] = useGetUser();
  const [updateState, updateUser] = useUpdateUser();
  
  const handleUpdate = async (updates: Partial<User>) => {
    // Optimistic update for immediate feedback
    setOptimisticUser({ ...optimisticUser, ...updates });
    
    try {
      const updatedUser = await updateUser({ 
        id: initialUser.id, 
        ...updates 
      });
      
      // Update with server response
      setOptimisticUser(updatedUser);
      
      // Optionally refresh full user data
      getUser({ id: initialUser.id });
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUser(initialUser);
      console.error('Update failed:', error);
    }
  };

  // Use the most current user data available
  const currentUser = userState.data || optimisticUser;

  return (
    <div>
      <UserDisplay user={currentUser} />
      
      <div className="user-actions">
        <button 
          onClick={() => handleUpdate({ name: 'New Name' })}
          disabled={updateState.loading}
        >
          {updateState.loading ? 'Updating...' : 'Update Name'}
        </button>
        
        <button 
          onClick={() => getUser({ id: initialUser.id })}
          disabled={userState.loading}
        >
          {userState.loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {updateState.error && (
        <div className="error">
          Update failed: {updateState.error.message}
        </div>
      )}
    </div>
  );
}
```

## Advanced Patterns

### Conditional Fetching

```tsx
// app/components/ConditionalUserData.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useGetUserPosts } from '@intrig/next/userApi/users/getUserPosts/client';
import { useState, useEffect } from 'react';

export function ConditionalUserData({ userId }: { userId: string }) {
  const [showPosts, setShowPosts] = useState(false);
  const [userState, getUser] = useGetUser();
  const [postsState, getUserPosts] = useGetUserPosts();
  
  useEffect(() => {
    getUser({ id: userId });
  }, [userId, getUser]);
  
  const handleTogglePosts = () => {
    if (!showPosts && !postsState.data) {
      // Fetch posts only when first needed
      getUserPosts({ userId });
    }
    setShowPosts(!showPosts);
  };

  if (userState.loading && !userState.data) {
    return <div>Loading user...</div>;
  }
  
  if (userState.error) {
    return <div>Error: {userState.error.message}</div>;
  }
  
  if (!userState.data) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <UserBasicInfo user={userState.data} />
      
      <button onClick={handleTogglePosts}>
        {showPosts ? 'Hide' : 'Show'} Posts
        {postsState.loading && ' (Loading...)'}
      </button>
      
      {showPosts && (
        <div>
          {postsState.error && (
            <div>Error loading posts: {postsState.error.message}</div>
          )}
          {postsState.data && <UserPosts posts={postsState.data} />}
        </div>
      )}
    </div>
  );
}
```

### Form Integration

```tsx
// app/components/UserEditForm.tsx
'use client';
import { useUpdateUser } from '@intrig/next/userApi/users/updateUser/client';
import { useState } from 'react';
import { z } from 'zod';

const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  bio: z.string().max(500, 'Bio too long'),
});

export function UserEditForm({ user }: { user: User }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    bio: user.bio || '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [updateState, updateUser] = useUpdateUser();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      const validatedData = userUpdateSchema.parse(formData);
      setValidationErrors({});
      
      await updateUser({ id: user.id, ...validatedData });
      
      // Handle success (could show toast, redirect, etc.)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
    }
  };
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="user-edit-form">
      <div className="form-field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={updateState.loading}
        />
        {validationErrors.name && (
          <span className="error">{validationErrors.name}</span>
        )}
      </div>
      
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={updateState.loading}
        />
        {validationErrors.email && (
          <span className="error">{validationErrors.email}</span>
        )}
      </div>
      
      <div className="form-field">
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          disabled={updateState.loading}
          maxLength={500}
        />
        {validationErrors.bio && (
          <span className="error">{validationErrors.bio}</span>
        )}
      </div>
      
      <button 
        type="submit" 
        disabled={updateState.loading}
        className="submit-button"
      >
        {updateState.loading ? 'Saving...' : 'Save Changes'}
      </button>
      
      {updateState.error && (
        <div className="error">
          Save failed: {updateState.error.message}
        </div>
      )}
      
      {updateState.data && (
        <div className="success">
          Profile updated successfully!
        </div>
      )}
    </form>
  );
}
```

## Performance Optimization

### Automatic Deduplication

```tsx
// Multiple components can call the same hook without duplicate requests
// app/components/UserDashboard.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useEffect } from 'react';

export function UserHeader({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser();
  
  useEffect(() => {
    getUser({ id: userId }); // Request 1
  }, [userId, getUser]);
  
  return <h1>{userState.data?.name}</h1>;
}

export function UserProfile({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser();
  
  useEffect(() => {
    getUser({ id: userId }); // Same request - automatically deduplicated
  }, [userId, getUser]);
  
  return <UserDetails user={userState.data} />;
}
```

### Manual Cache Management

```tsx
// app/components/UserManagement.tsx
'use client';
import { useGetUser } from '@intrig/next/userApi/users/getUser/client';
import { useUpdateUser } from '@intrig/next/userApi/users/updateUser/client';

export function UserManagement({ userId }: { userId: string }) {
  const [userState, getUser, { clearCache, invalidateCache }] = useGetUser();
  const [updateState, updateUser] = useUpdateUser();
  
  const handleUpdate = async (updates: Partial<User>) => {
    try {
      await updateUser({ id: userId, ...updates });
      
      // Invalidate cache to force refresh
      invalidateCache();
      
      // Or clear cache completely
      // clearCache();
      
      // Fetch fresh data
      getUser({ id: userId });
    } catch (error) {
      console.error('Update failed:', error);
    }
  };
  
  return (
    <div>
      <UserDisplay user={userState.data} />
      <button onClick={() => handleUpdate({ name: 'New Name' })}>
        Update User
      </button>
    </div>
  );
}
```

## Import Patterns

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