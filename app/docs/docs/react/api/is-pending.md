# isPending

The **isPending** function is a TypeScript type guard that checks whether a `NetworkState` represents an ongoing API request. It provides type-safe access to loading state information by narrowing the type from a general `NetworkState<T, E>` to a specific `PendingState<T, E>`.

## Overview

`isPending` is essential for managing loading states in your React components. It ensures that you can safely show loading indicators, progress bars, and disable user interactions during active network requests, providing excellent TypeScript intellisense for loading state management.

## Function Signature

```typescript
function isPending<T, E = unknown>(
  state: NetworkState<T, E>
): state is PendingState<T, E>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `T` | The type of the successful response data |
| `E` | The type of the error (defaults to `unknown`) |

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `NetworkState<T, E>` | The network state to check |

### Returns

| Type | Description |
|------|-------------|
| `state is PendingState<T, E>` | Type predicate that narrows the state to `PendingState<T, E>` when `true` |

## PendingState Interface

When `isPending` returns `true`, the state is narrowed to `PendingState<T, E>` which includes:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'pending'` | Always `'pending'` for pending states |
| `progress` | `Progress` (optional) | Upload/download progress information |
| `data` | `T` (optional) | Partial data available during request |

### Progress Interface

The optional `progress` property provides detailed information about ongoing uploads or downloads:

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'upload' \| 'download'` (optional) | Type of operation |
| `loaded` | `number` | Bytes loaded so far |
| `total` | `number` (optional) | Total bytes to transfer (if known) |

## Basic Usage

### Simple Loading State

```jsx
import React from 'react';
import { useGetUsers, isPending, isSuccess, isError } from '@intrig/react';

function UsersList() {
  const [usersResponse, fetchUsers] = useGetUsers({
    fetchOnMount: true
  });

  if (isPending(usersResponse)) {
    // TypeScript now knows usersResponse has pending state properties
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading users...</p>
      </div>
    );
  }

  if (isError(usersResponse)) {
    return (
      <div className="error">
        <p>Failed to load users</p>
        <button onClick={() => fetchUsers()}>Try Again</button>
      </div>
    );
  }

  if (isSuccess(usersResponse)) {
    return (
      <div>
        <h2>Users ({usersResponse.data.length})</h2>
        <ul>
          {usersResponse.data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <div>Click to load users</div>;
}
```

### Loading with Progress Bar

```jsx
import React from 'react';
import { useUploadFile, isPending } from '@intrig/react';

function FileUploader() {
  const [uploadResponse, uploadFile] = useUploadFile({
    fetchOnMount: false
  });

  const handleFileUpload = (file) => {
    uploadFile({ body: { file } });
  };

  if (isPending(uploadResponse)) {
    const { progress } = uploadResponse;
    
    if (progress && progress.total) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      
      return (
        <div className="upload-progress">
          <p>Uploading... {percentage}%</p>
          <progress value={progress.loaded} max={progress.total} />
          <p>{progress.loaded} / {progress.total} bytes</p>
        </div>
      );
    }

    return (
      <div className="uploading">
        <div className="spinner" />
        <p>Uploading file...</p>
      </div>
    );
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => handleFileUpload(e.target.files[0])} 
      />
    </div>
  );
}
```

### Conditional Button States

```jsx
import React from 'react';
import { useCreateUser, isPending, isSuccess, isError } from '@intrig/react';

function CreateUserForm() {
  const [createResponse, createUser] = useCreateUser({
    fetchOnMount: false
  });

  const handleSubmit = async (formData) => {
    await createUser({ body: formData });
  };

  const isLoading = isPending(createResponse);
  const hasError = isError(createResponse);
  const isComplete = isSuccess(createResponse);

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input name="name" placeholder="Name" disabled={isLoading} />
      <input name="email" placeholder="Email" disabled={isLoading} />
      
      <button 
        type="submit" 
        disabled={isLoading}
        className={isLoading ? 'loading' : ''}
      >
        {isLoading ? 'Creating...' : 'Create User'}
      </button>

      {hasError && (
        <div className="error">Failed to create user</div>
      )}

      {isComplete && (
        <div className="success">User created successfully!</div>
      )}
    </form>
  );
}
```

## Advanced Usage

### Loading Skeleton

```jsx
import React from 'react';
import { useGetUserProfile, isPending, isSuccess } from '@intrig/react';

function UserProfileSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-avatar" />
      <div className="skeleton-text skeleton-text-long" />
      <div className="skeleton-text skeleton-text-short" />
    </div>
  );
}

function UserProfile({ userId }) {
  const [profileResponse] = useGetUserProfile({
    fetchOnMount: true,
    params: { userId }
  });

  if (isPending(profileResponse)) {
    // Show skeleton while loading
    return <UserProfileSkeleton />;
  }

  if (isSuccess(profileResponse)) {
    const { data: profile } = profileResponse;
    return (
      <div className="profile">
        <img src={profile.avatar} alt={profile.name} />
        <h1>{profile.name}</h1>
        <p>{profile.email}</p>
      </div>
    );
  }

  return <div>Failed to load profile</div>;
}
```

### Global Loading Indicator

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { isPending } from '@intrig/react';

const LoadingContext = createContext();

function LoadingProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0);

  return (
    <LoadingContext.Provider value={{ activeRequests, setActiveRequests }}>
      {children}
      {activeRequests > 0 && (
        <div className="global-loading-indicator">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

function useGlobalLoading(response) {
  const { setActiveRequests } = useContext(LoadingContext);

  useEffect(() => {
    if (isPending(response)) {
      setActiveRequests(prev => prev + 1);
      return () => setActiveRequests(prev => prev - 1);
    }
  }, [response, setActiveRequests]);
}

function DataComponent() {
  const [dataResponse] = useGetData({ fetchOnMount: true });
  useGlobalLoading(dataResponse);

  // Component logic...
  return null;
}
```

### Loading with Timeout

```jsx
import React, { useState, useEffect } from 'react';
import { useGetData, isPending, isSuccess, isError } from '@intrig/react';

function DataWithTimeout() {
  const [showTimeout, setShowTimeout] = useState(false);
  const [dataResponse, fetchData] = useGetData({
    fetchOnMount: true
  });

  useEffect(() => {
    if (isPending(dataResponse)) {
      // Show timeout message after 10 seconds
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 10000);

      return () => {
        clearTimeout(timer);
        setShowTimeout(false);
      };
    }
  }, [dataResponse]);

  if (isPending(dataResponse)) {
    return (
      <div className="loading-with-timeout">
        <div className="spinner" />
        <p>Loading data...</p>
        {showTimeout && (
          <div className="timeout-warning">
            <p>This is taking longer than expected...</p>
            <button onClick={() => fetchData()}>Retry</button>
          </div>
        )}
      </div>
    );
  }

  if (isError(dataResponse)) {
    return <div>Error loading data</div>;
  }

  if (isSuccess(dataResponse)) {
    return <div>Data: {JSON.stringify(dataResponse.data)}</div>;
  }

  return <div>Ready to load data</div>;
}
```

### Progressive Loading

```jsx
import React from 'react';
import { useGetDetailedData, isPending, isSuccess } from '@intrig/react';

function ProgressiveDataLoader() {
  const [dataResponse] = useGetDetailedData({
    fetchOnMount: true
  });

  if (isPending(dataResponse)) {
    const { data: partialData } = dataResponse;
    
    return (
      <div className="progressive-loading">
        <div className="loading-header">
          <div className="spinner" />
          <span>Loading detailed data...</span>
        </div>
        
        {partialData && (
          <div className="partial-data">
            <h3>Preview (Loading...)</h3>
            <pre>{JSON.stringify(partialData, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  if (isSuccess(dataResponse)) {
    return (
      <div className="complete-data">
        <h3>Complete Data</h3>
        <pre>{JSON.stringify(dataResponse.data, null, 2)}</pre>
      </div>
    );
  }

  return <div>Failed to load data</div>;
}
```

## Common Patterns

### Debounced Loading State

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchUsers, isPending } from '@intrig/react';

function UserSearch() {
  const [query, setQuery] = useState('');
  const [searchResponse, searchUsers] = useSearchUsers({
    fetchOnMount: false
  });

  useEffect(() => {
    if (query.length > 2) {
      const debounceTimer = setTimeout(() => {
        searchUsers({ params: { q: query } });
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [query, searchUsers]);

  const isSearching = isPending(searchResponse);

  return (
    <div>
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
        />
        {isSearching && <div className="inline-spinner" />}
      </div>
      
      {/* Search results */}
    </div>
  );
}
```

### Optimistic Updates

```jsx
import React, { useState } from 'react';
import { useUpdateUser, isPending, isError } from '@intrig/react';

function UserEditor({ user, onUpdate }) {
  const [optimisticUser, setOptimisticUser] = useState(user);
  const [updateResponse, updateUser] = useUpdateUser({
    fetchOnMount: false
  });

  const handleUpdate = async (updates) => {
    // Optimistic update
    setOptimisticUser({ ...optimisticUser, ...updates });
    
    try {
      await updateUser({ 
        params: { id: user.id }, 
        body: updates 
      });
      onUpdate({ ...user, ...updates });
    } catch {
      // Revert on error
      setOptimisticUser(user);
    }
  };

  const isSaving = isPending(updateResponse);
  const hasError = isError(updateResponse);

  return (
    <div className="user-editor">
      <input
        value={optimisticUser.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
        disabled={isSaving}
      />
      
      {isSaving && (
        <span className="saving-indicator">Saving...</span>
      )}
      
      {hasError && (
        <span className="error-indicator">Failed to save</span>
      )}
    </div>
  );
}
```

### Batch Loading States

```jsx
import React from 'react';
import { isPending } from '@intrig/react';

function BatchLoader({ requests }) {
  const pendingCount = requests.filter(req => isPending(req)).length;
  const totalCount = requests.length;
  const isAnyPending = pendingCount > 0;
  const progress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;

  if (!isAnyPending) {
    return <div>All requests completed</div>;
  }

  return (
    <div className="batch-loader">
      <p>Loading {pendingCount} of {totalCount} requests...</p>
      <progress value={progress} max={100} />
      <span>{Math.round(progress)}%</span>
    </div>
  );
}
```

## Type Safety Benefits

The `isPending` function provides several TypeScript benefits:

1. **Type Narrowing**: After the check, TypeScript knows you have a `PendingState<T, E>`
2. **Progress Access**: Safe access to progress information when available
3. **Compile-time Safety**: Prevents accessing pending-specific properties when they might not exist
4. **Partial Data Access**: Type-safe access to any partial data available during loading

## Related Functions

- [`isSuccess`](./is-success.md) - Check if a request succeeded
- [`isError`](./is-error.md) - Check if a request failed
- [`isInit`](./is-init.md) - Check if a request hasn't started yet
- [`NetworkState`](./network-state.md) - The base state interface

## Best Practices

1. **Provide clear loading feedback**: Always show users when operations are in progress
2. **Disable interactions during loading**: Prevent duplicate requests by disabling buttons/forms
3. **Use progress indicators**: Show progress bars for file uploads or long operations
4. **Handle loading timeouts**: Provide escape routes for operations that take too long
5. **Consider skeleton screens**: Use skeleton loading for better perceived performance
6. **Implement optimistic updates**: Update UI immediately for better user experience

## Troubleshooting

### Common Issues

**Issue**: Progress information not available
```typescript
// ❌ Bad - progress might not exist
if (isPending(response)) {
  const percentage = (response.progress.loaded / response.progress.total) * 100;
}

// ✅ Good - always check if progress exists
if (isPending(response)) {
  const { progress } = response;
  if (progress && progress.total) {
    const percentage = (progress.loaded / progress.total) * 100;
  }
}
```

**Issue**: Loading state doesn't update UI
```typescript
// ✅ Make sure to include response in dependencies
useEffect(() => {
  if (isPending(response)) {
    // Handle loading state
  }
}, [response]); // Include response in dependencies
```

**Issue**: Partial data not accessible
```typescript
// ❌ Bad - data might not be available
if (isPending(response)) {
  return <div>{response.data.name}</div>; // Could be undefined
}

// ✅ Good - check if partial data exists
if (isPending(response)) {
  const { data: partialData } = response;
  return partialData ? (
    <div>Loading: {partialData.name}</div>
  ) : (
    <div>Loading...</div>
  );
}
```