# isError

The **isError** function is a TypeScript type guard that checks whether a `NetworkState` represents a failed API response. It provides type-safe access to error information by narrowing the type from a general `NetworkState<T, E>` to a specific `ErrorState<T, E>`.

## Overview

`isError` is essential for safely handling network request failures in your React components. It ensures that you can only access the `error` property when the request has actually failed, preventing runtime errors and providing excellent TypeScript intellisense for error handling.

## Function Signature

```tsx
function isError<T>(
  state: NetworkState<T>
): state is ErrorState<T>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `T` | The type of the successful response data |

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `NetworkState<T>` | The network state to check |

### Returns

| Type | Description |
|------|-------------|
| `state is ErrorState<T>` | Type predicate that narrows the state to `ErrorState<T>` when `true` |

## ErrorState Interface

When `isError` returns `true`, the state is narrowed to `ErrorState<T>` which includes:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'error'` | Always `'error'` for error states |
| `error` | `IntrigError` | The structured error object containing type, status, and context information |

## Basic Usage

### Simple Error Handling

```jsx
import React from 'react';
import { useGetUsers, isError, isPending, isSuccess } from '@intrig/next';

function UsersList() {
  const [usersResponse, fetchUsers] = useGetUsers({
    fetchOnMount: true
  });

  if (isPending(usersResponse)) {
    return <div>Loading users...</div>;
  }

  if (isError(usersResponse)) {
    // TypeScript now knows usersResponse.error is available and properly typed
    return (
      <div className="error">
        <h2>Failed to load users</h2>
        <p>Error: {String(usersResponse.error)}</p>
        <button onClick={() => fetchUsers()}>
          Try Again
        </button>
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

### Detailed Error Display

```jsx
import React from 'react';
import { useCreateUser, isError, isPending } from '@intrig/next';

function CreateUserForm() {
  const [createResponse, createUser] = useCreateUser({
    fetchOnMount: false
  });

  const handleSubmit = async (formData) => {
    await createUser({ body: formData });
  };

  if (isPending(createResponse)) {
    return <div>Creating user...</div>;
  }

  if (isError(createResponse)) {
    const { error, statusCode } = createResponse;
    
    return (
      <div className="error-container">
        <h3>Failed to create user</h3>
        
        {statusCode === 400 && (
          <p>Please check your input data</p>
        )}
        
        {statusCode === 401 && (
          <p>You are not authorized to create users</p>
        )}
        
        {statusCode === 500 && (
          <p>Server error occurred. Please try again later.</p>
        )}
        
        <details>
          <summary>Error Details</summary>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
        
        <button onClick={() => handleSubmit()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Global Error Handler

```jsx
import React from 'react';
import { useGetData, isError, isPending, isSuccess } from '@intrig/next';

function DataWithErrorBoundary() {
  const [dataResponse] = useGetData({
    fetchOnMount: true
  });

  const renderError = (errorState) => {
    const { error, statusCode } = errorState;
    
    // Handle different error types
    if (statusCode === 404) {
      return (
        <div className="not-found">
          <h2>Data Not Found</h2>
          <p>The requested data could not be found.</p>
        </div>
      );
    }

    if (statusCode >= 500) {
      return (
        <div className="server-error">
          <h2>Server Error</h2>
          <p>Something went wrong on our end. Please try again later.</p>
        </div>
      );
    }

    if (statusCode === 403) {
      return (
        <div className="forbidden">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this resource.</p>
        </div>
      );
    }

    // Generic error fallback
    return (
      <div className="generic-error">
        <h2>Something went wrong</h2>
        <p>{String(error)}</p>
      </div>
    );
  };

  if (isPending(dataResponse)) {
    return <div>Loading...</div>;
  }

  if (isError(dataResponse)) {
    return renderError(dataResponse);
  }

  if (isSuccess(dataResponse)) {
    return <div>Data: {JSON.stringify(dataResponse.data)}</div>;
  }

  return <div>Ready to load data</div>;
}
```

## Advanced Usage

### Error Classification

```jsx
import React from 'react';
import { useGetUserProfile, isError } from '@intrig/next';

function UserProfile({ userId }) {
  const [profileResponse] = useGetUserProfile({
    fetchOnMount: true,
    params: { userId }
  });

  if (isError(profileResponse)) {
    const { error, statusCode } = profileResponse;
    
    // Classify error types
    const isNetworkError = !statusCode;
    const isClientError = statusCode && statusCode >= 400 && statusCode < 500;
    const isServerError = statusCode && statusCode >= 500;
    const isValidationError = statusCode === 422;

    if (isNetworkError) {
      return (
        <div className="network-error">
          <h3>Network Error</h3>
          <p>Please check your internet connection</p>
        </div>
      );
    }

    if (isValidationError) {
      return (
        <div className="validation-error">
          <h3>Invalid Data</h3>
          <p>{String(error)}</p>
        </div>
      );
    }

    if (isClientError) {
      return (
        <div className="client-error">
          <h3>Request Error ({statusCode})</h3>
          <p>{String(error)}</p>
        </div>
      );
    }

    if (isServerError) {
      return (
        <div className="server-error">
          <h3>Server Error ({statusCode})</h3>
          <p>Please try again later</p>
        </div>
      );
    }
  }

  // Handle other states...
  return null;
}
```

### Error Recovery Pattern

```jsx
import React, { useState, useCallback } from 'react';
import { useGetData, isError, isPending } from '@intrig/next';

function DataWithRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const [dataResponse, fetchData] = useGetData({
    fetchOnMount: true
  });

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchData();
  }, [fetchData]);

  if (isPending(dataResponse)) {
    return (
      <div>
        Loading data...
        {retryCount > 0 && <span> (Attempt {retryCount + 1})</span>}
      </div>
    );
  }

  if (isError(dataResponse)) {
    const { error, statusCode } = dataResponse;
    const maxRetries = 3;
    const canRetry = retryCount < maxRetries;

    return (
      <div className="error-with-retry">
        <h3>Failed to Load Data</h3>
        <p>Error: {String(error)}</p>
        {statusCode && <p>Status: {statusCode}</p>}
        
        {canRetry ? (
          <button onClick={handleRetry}>
            Retry ({retryCount}/{maxRetries})
          </button>
        ) : (
          <p>Maximum retry attempts reached. Please refresh the page.</p>
        )}
      </div>
    );
  }

  // Handle success state...
  return null;
}
```

### Custom Error Types

```tsx
import React from 'react';
import { useGetUsers, isError } from '@intrig/next';

interface APIError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

function UsersWithTypedErrors() {
  const [usersResponse] = useGetUsers({
    fetchOnMount: true
  });

  if (isError(usersResponse)) {
    const { error, statusCode } = usersResponse;
    
    // Type-safe error handling when you know the error structure
    const apiError = error as APIError;
    
    return (
      <div className="typed-error">
        <h3>Error Loading Users</h3>
        <p>Message: {apiError.message}</p>
        <p>Code: {apiError.code}</p>
        <p>Status: {statusCode}</p>
        
        {apiError.details && (
          <details>
            <summary>Additional Details</summary>
            <pre>{JSON.stringify(apiError.details, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  }

  // Handle other states...
  return null;
}
```

## Common Patterns

### Error Toast Notifications

```jsx
import React, { useEffect } from 'react';
import { useGetData, isError } from '@intrig/next';
import { toast } from 'react-toastify';

function DataWithErrorToasts() {
  const [dataResponse] = useGetData({
    fetchOnMount: true
  });

  useEffect(() => {
    if (isError(dataResponse)) {
      const { error, statusCode } = dataResponse;
      toast.error(`Failed to load data: ${String(error)} (${statusCode})`);
    }
  }, [dataResponse]);

  // Component rendering logic...
  return null;
}
```

### Conditional Error Boundary

```jsx
function ErrorBoundaryWrapper({ children, response }) {
  if (isError(response)) {
    return <GlobalErrorFallback error={response} />;
  }

  return children;
}

function MyComponent() {
  const [dataResponse] = useGetData({ fetchOnMount: true });

  return (
    <ErrorBoundaryWrapper response={dataResponse}>
      <DataDisplay response={dataResponse} />
    </ErrorBoundaryWrapper>
  );
}
```

## Type Safety Benefits

The `isError` function provides several TypeScript benefits:

1. **Type Narrowing**: After the check, TypeScript knows you have an `ErrorState<T, E>`
2. **Intellisense**: Full autocomplete support for error properties
3. **Compile-time Safety**: Prevents accessing error properties when they might not exist
4. **Error Prevention**: Eliminates runtime errors from undefined error access

## Related Functions

- [`isSuccess`](./is-success.md) - Check if a request succeeded
- [`isPending`](./is-pending.md) - Check if a request is in progress
- [`isInit`](./is-init.md) - Check if a request hasn't started yet
- [`NetworkState`](./network-state.md) - The base state interface

## Best Practices

1. **Always handle errors gracefully**: Use `isError` to provide meaningful error messages to users
2. **Classify errors appropriately**: Different error types should have different handling strategies
3. **Provide retry mechanisms**: Allow users to retry failed requests when appropriate
4. **Use status codes**: Leverage HTTP status codes for more specific error handling
5. **Consider error recovery**: Implement patterns that help users recover from errors
6. **Log errors appropriately**: Send error information to monitoring services while being mindful of sensitive data

## Troubleshooting

### Common Issues

**Issue**: Error property is undefined even after `isError` check
```tsx
// ❌ Bad - might happen if error state is not properly constructed
if (isError(response)) {
  console.log(response.error); // Could be undefined
}

// ✅ Good - always handle the case where error might be undefined
if (isError(response)) {
  const errorMessage = response.error ? String(response.error) : 'Unknown error';
  console.log(errorMessage);
}
```

**Issue**: Status code not available
```tsx
// ✅ Always check if statusCode exists before using it
if (isError(response)) {
  const statusCode = response.statusCode ?? 0;
  const errorType = statusCode >= 500 ? 'server' : 'client';
}
```

**Issue**: Error not properly typed
```tsx
// ✅ Use type assertions carefully with proper error interfaces
interface APIError {
  message: string;
  code: string;
}

if (isError(response)) {
  const apiError = response.error as APIError;
  // Now you have typed access to error properties
}
```