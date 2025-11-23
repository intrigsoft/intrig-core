# isInit

The **isInit** function is a TypeScript type guard that checks whether a `NetworkState` represents the initial state of an API request that hasn't been started yet. It provides type-safe identification of uninitialized network requests by narrowing the type from a general `NetworkState<T, E>` to a specific `InitState<T, E>`.

## Overview

`isInit` is essential for handling the initial state of network requests in your React components. It ensures that you can safely identify when a request hasn't been made yet, allowing you to show appropriate UI states like "ready to load" messages, initial data entry forms, or call-to-action buttons.

## Function Signature

```tsx
function isInit<T, E = unknown>(
  state: NetworkState<T, E>
): state is InitState<T, E>
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
| `state is InitState<T, E>` | Type predicate that narrows the state to `InitState<T, E>` when `true` |

## InitState Interface

When `isInit` returns `true`, the state is narrowed to `InitState<T, E>` which includes:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'init'` | Always `'init'` for initial states |

Note: The init state is the simplest of all network states, containing only the state indicator.

## Basic Usage

### Initial Load Button

```jsx
import React from 'react';
import { useGetUsers, isInit, isPending, isSuccess, isError } from '@intrig/next';

function UsersList() {
  const [usersResponse, fetchUsers] = useGetUsers({
    fetchOnMount: false // Don't auto-fetch, let user trigger
  });

  if (isInit(usersResponse)) {
    // TypeScript now knows this is the initial state
    return (
      <div className="initial-state">
        <h2>Users</h2>
        <p>Click the button below to load users.</p>
        <button onClick={() => fetchUsers()}>
          Load Users
        </button>
      </div>
    );
  }

  if (isPending(usersResponse)) {
    return <div>Loading users...</div>;
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

  return null;
}
```

### Conditional Form Display

```jsx
import React, { useState } from 'react';
import { useCreateUser, isInit, isPending, isSuccess, isError } from '@intrig/next';

function CreateUserForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [createResponse, createUser] = useCreateUser({
    fetchOnMount: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createUser({ body: formData });
  };

  if (isInit(createResponse)) {
    return (
      <form onSubmit={handleSubmit} className="user-form">
        <h3>Create New User</h3>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        <button type="submit">Create User</button>
      </form>
    );
  }

  if (isPending(createResponse)) {
    return <div>Creating user...</div>;
  }

  if (isError(createResponse)) {
    return (
      <div className="error">
        <p>Failed to create user</p>
        <button onClick={() => window.location.reload()}>
          Reset Form
        </button>
      </div>
    );
  }

  if (isSuccess(createResponse)) {
    return (
      <div className="success">
        <h3>User Created Successfully!</h3>
        <p>User {createResponse.data.name} has been created.</p>
        <button onClick={() => window.location.reload()}>
          Create Another User
        </button>
      </div>
    );
  }

  return null;
}
```

## Type Safety Benefits

The `isInit` function provides several TypeScript benefits:

1. **Type Narrowing**: After the check, TypeScript knows you have an `InitState<T, E>`
2. **State Clarity**: Clearly identifies when no request has been made
3. **Compile-time Safety**: Prevents assumptions about data availability
4. **Flow Control**: Enables proper conditional rendering based on initialization state

## Related Functions

- [`isSuccess`](./is-success.md) - Check if a request succeeded
- [`isError`](./is-error.md) - Check if a request failed
- [`isPending`](./is-pending.md) - Check if a request is in progress
- [`NetworkState`](./network-state.md) - The base state interface

## Best Practices

1. **Show clear initial states**: Use `isInit` to display helpful messages or call-to-action buttons
2. **Avoid auto-fetching when appropriate**: Let users trigger requests manually for better control
3. **Provide context**: Explain what will happen when users trigger the initial request
4. **Handle reset scenarios**: Allow users to return to the initial state when needed
5. **Use for form states**: Great for forms that should be pristine until submitted
6. **Progressive disclosure**: Load data only when users explicitly request it

## Troubleshooting

### Common Issues

**Issue**: State never shows as init after component mount
```tsx
// ❌ Bad - fetchOnMount: true will skip init state
const [response] = useGetData({ fetchOnMount: true });

// ✅ Good - fetchOnMount: false preserves init state
const [response, fetchData] = useGetData({ fetchOnMount: false });
```

**Issue**: Cannot trigger request from init state
```tsx
// ❌ Bad - missing fetch function
const [response] = useGetData({ fetchOnMount: false });

// ✅ Good - destructure the fetch function
const [response, fetchData] = useGetData({ fetchOnMount: false });
if (isInit(response)) {
  // Now you can call fetchData()
}
```

**Issue**: Init state not properly reset
```tsx
// ✅ Use the reset function if available
const [response, fetchData, resetData] = useGetData({ fetchOnMount: false });

const handleReset = () => {
  resetData(); // This returns state to 'init'
};
```