# isPending

The **isPending** function is a TypeScript type guard that checks whether a `NetworkState` represents an ongoing API request. It provides type-safe access to loading state information by narrowing the type from a general `NetworkState<T, E>` to a specific `PendingState<T, E>`.

## Overview

`isPending` is essential for managing loading states in your React components. It ensures that you can safely show loading indicators, progress bars, and disable user interactions during active network requests, providing excellent TypeScript intellisense for loading state management.

## Function Signature

```tsx
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
import { useGetUsers, isPending, isSuccess, isError } from '@intrig/next';

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
import { useUploadFile, isPending } from '@intrig/next';

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
```tsx
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
```tsx
// ✅ Make sure to include response in dependencies
useEffect(() => {
  if (isPending(response)) {
    // Handle loading state
  }
}, [response]); // Include response in dependencies
```

**Issue**: Partial data not accessible
```tsx
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