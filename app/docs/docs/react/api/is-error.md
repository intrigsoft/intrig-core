# isError

The **isError** function is a TypeScript type guard that checks whether a `NetworkState` represents a failed API response. It provides type-safe access to error information by narrowing the type from a general `NetworkState<T, E>` to a specific `ErrorState<T, E>`.

## Overview

`isError` is essential for safely handling network request failures in your React components. It ensures that you can only access the `error` property when the request has actually failed, preventing runtime errors and providing excellent TypeScript intellisense for error handling.

## Function Signature

```typescript
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
import { useGetUsers, isError, isPending, isSuccess } from '@intrig/react';

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
import { useCreateUser, isError, isPending } from '@intrig/react';

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

### Error Classification

```jsx
import React from 'react';
import { useGetUserProfile, isError } from '@intrig/react';

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

### Common Issues

**Issue**: Error property is undefined even after `isError` check
```typescript
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
```typescript
// ✅ Always check if statusCode exists before using it
if (isError(response)) {
  const statusCode = response.statusCode ?? 0;
  const errorType = statusCode >= 500 ? 'server' : 'client';
}
```

**Issue**: Error not properly typed
```typescript
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