# NetworkState

**NetworkState** is an algebraic data type that represents the complete lifecycle of an asynchronous network request. It models the state of API calls through four mutually exclusive states: `init`, `pending`, `success`, and `error`. This design ensures type safety and makes it impossible for your application to be in an inconsistent state.

## Overview

NetworkState follows the principles of algebraic data types (ADTs), where a value can be exactly one of several possible variants. This approach eliminates common bugs related to undefined or inconsistent network state and provides excellent TypeScript support with exhaustive pattern matching.

The NetworkState transitions follow a predictable state machine:

```
                 ┌──────┐
   ┌─────────────► Init ◄────────────┐
   │             └▲────┬┘            │
   │              │    │             │
   │           Reset  Execute        │
 Reset            │    │           Reset
   │           ┌──┴────┴──┐          │
   │      ┌────► Pending  ◄────┐     │
   │      │    └──┬────┬──┘    │     │
   │   Execute    │    │    Execute  │
   │      │       │    │       │     │
   │      │ OnSuccess OnError  │     │
   │ ┌────┴──┐    │    │    ┌──┴───┐ │
   └─┤Success◄────┘    └────►Error ├─┘
     └───────┘              └──────┘
```

## Base Interface

### NetworkState&lt;T, E&gt;

The base interface that all network states extend from.

```typescript
interface NetworkState<T = unknown, E = unknown> {
  state: 'init' | 'pending' | 'success' | 'error';
}
```

#### Type Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `T` | The type of successful response data | `unknown` |
| `E` | The type of error data | `unknown` |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'init' \| 'pending' \| 'success' \| 'error'` | The current state of the network request |

## State Variants

NetworkState is a discriminated union of four specific state interfaces:

### InitState&lt;T, E&gt;

Represents a network request that hasn't been initiated yet.

```typescript
interface InitState<T, E = unknown> extends NetworkState<T, E> {
  state: 'init';
}
```

**Usage**: Initial state before any network call is made. Ideal for showing loading buttons or form entry points.

### PendingState&lt;T, E&gt;

Represents a network request that is currently in progress.

```typescript
interface PendingState<T, E = unknown> extends NetworkState<T, E> {
  state: 'pending';
  progress?: Progress;
  data?: T;
}
```

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `progress` | `Progress` (optional) | Upload/download progress information |
| `data` | `T` (optional) | Partial data available during the request |

#### Progress Interface

```typescript
interface Progress {
  type?: 'upload' | 'download';
  loaded: number;
  total?: number;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'upload' \| 'download'` (optional) | Type of operation |
| `loaded` | `number` | Bytes loaded so far |
| `total` | `number` (optional) | Total bytes to transfer |

**Usage**: Active network requests, file uploads with progress tracking, streaming operations.

### SuccessState&lt;T, E&gt;

Represents a successfully completed network request.

```typescript
interface SuccessState<T, E = unknown> extends NetworkState<T, E> {
  state: 'success';
  data: T;
}
```

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T` | The successful response data |

**Usage**: Completed requests with data ready for consumption.

### ErrorState&lt;T, E&gt;

Represents a failed network request.

```typescript
interface ErrorState<T, E = unknown> extends NetworkState<T, E> {
  state: 'error';
  error: E;
  statusCode?: number;
  request?: any;
}
```

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `error` | `E` | The error object or message |
| `statusCode` | `number` (optional) | HTTP status code if available |
| `request` | `any` (optional) | The original request object |

**Usage**: Failed requests with error information for debugging and user feedback.

## Working with NetworkState

### Type Guards

Use the provided type guard functions to safely work with NetworkState:

```typescript
import { isInit, isPending, isSuccess, isError } from '@intrig/react';

function handleResponse<T>(response: NetworkState<T>) {
  if (isInit(response)) {
    // TypeScript knows this is InitState<T>
    return "Ready to load";
  }
  
  if (isPending(response)) {
    // TypeScript knows this is PendingState<T>
    return response.progress ? "Loading with progress" : "Loading";
  }
  
  if (isSuccess(response)) {
    // TypeScript knows this is SuccessState<T>
    return `Loaded: ${JSON.stringify(response.data)}`;
  }
  
  if (isError(response)) {
    // TypeScript knows this is ErrorState<T>
    return `Error: ${response.error}`;
  }
}
```

### Pattern Matching

NetworkState enables exhaustive pattern matching:

```typescript
function renderState<T>(state: NetworkState<T>) {
  switch (state.state) {
    case 'init':
      return React.createElement('div', null, 'Click to load data');
    
    case 'pending':
      return React.createElement('div', null, 'Loading...');
    
    case 'success':
      return React.createElement('div', null, `Data: ${JSON.stringify(state.data)}`);
    
    case 'error':
      return React.createElement('div', null, `Error: ${String(state.error)}`);
    
    default:
      // TypeScript will error if we miss a case
      const _exhaustive: never = state;
      return _exhaustive;
  }
}
```

## Common Usage Patterns

### Basic State Handling

```jsx
import React from 'react';
import { useGetUsers, isInit, isPending, isSuccess, isError } from '@intrig/react';

function UsersList() {
  const [usersState, fetchUsers] = useGetUsers({ fetchOnMount: false });

  // Handle each state explicitly
  if (isInit(usersState)) {
    return (
      <div>
        <button onClick={() => fetchUsers()}>Load Users</button>
      </div>
    );
  }

  if (isPending(usersState)) {
    return <div>Loading users...</div>;
  }

  if (isError(usersState)) {
    return (
      <div>
        <p>Error: {String(usersState.error)}</p>
        <button onClick={() => fetchUsers()}>Retry</button>
      </div>
    );
  }

  if (isSuccess(usersState)) {
    return (
      <div>
        <h2>Users ({usersState.data.length})</h2>
        <ul>
          {usersState.data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
```

### Conditional Rendering Helper

```typescript
function createStateRenderer<T, E = unknown>(
  init: () => React.ReactNode,
  pending: (state: PendingState<T, E>) => React.ReactNode,
  success: (state: SuccessState<T, E>) => React.ReactNode,
  error: (state: ErrorState<T, E>) => React.ReactNode,
) {
  return (state: NetworkState<T, E>) => {
    if (isInit(state)) return init();
    if (isPending(state)) return pending(state);
    if (isSuccess(state)) return success(state);
    if (isError(state)) return error(state);
    return null;
  };
}

// Usage
const renderUsers = createStateRenderer(
  () => React.createElement('button', null, 'Load Users'),
  () => React.createElement('div', null, 'Loading...'),
  (state) => React.createElement(UserList, { users: state.data }),
  (state) => React.createElement(ErrorMessage, { error: state.error })
);
```

### Progress Tracking

```jsx
function FileUpload() {
  const [uploadState, uploadFile] = useUploadFile({ fetchOnMount: false });

  const renderProgress = () => {
    if (isPending(uploadState) && uploadState.progress) {
      const { loaded, total, type } = uploadState.progress;
      const percentage = total ? Math.round((loaded / total) * 100) : 0;
      
      return (
        <div className="upload-progress">
          <div>
            {type === 'upload' ? 'Uploading' : 'Processing'}: {percentage}%
          </div>
          <progress value={loaded} max={total} />
          <div>{loaded} / {total} bytes</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {renderProgress()}
      {/* Other UI elements */}
    </div>
  );
}
```

### Error Classification

```typescript
function classifyError(errorState: ErrorState<any, any>) {
  const { statusCode, error } = errorState;
  
  if (!statusCode) {
    return { type: 'network', message: 'Network connection failed' };
  }
  
  if (statusCode >= 400 && statusCode < 500) {
    return { type: 'client', message: `Client error: ${error}` };
  }
  
  if (statusCode >= 500) {
    return { type: 'server', message: 'Server error occurred' };
  }
  
  return { type: 'unknown', message: String(error) };
}
```

## Advanced Types

### ErrorWithContext

Extended error state with additional contextual information:

```typescript
interface ErrorWithContext<T = unknown, E = unknown> extends ErrorState<T, E> {
  source: string;      // Origin of the error
  operation: string;   // Operation being performed
  key: string;         // Unique error identifier
}
```

### NetworkAction

Represents a network action with metadata:

```typescript
interface NetworkAction<T, E> {
  key: string;
  source: string;
  operation: string;
  state: NetworkState<T, E>;
  handled?: boolean;
}
```

## Type Safety Benefits

NetworkState provides several TypeScript advantages:

1. **Exhaustive Checking**: TypeScript ensures all states are handled
2. **Type Narrowing**: Type guards provide exact type information
3. **Compile-time Safety**: Impossible to access properties that don't exist
4. **Intellisense**: Full autocomplete support for each state variant
5. **Refactoring Safety**: Changes to state structure are caught at compile time

## Best Practices

1. **Always handle all states**: Use exhaustive pattern matching or handle each state explicitly
2. **Use type guards**: Prefer `isSuccess`, `isPending`, etc. over direct property checks
3. **Leverage TypeScript**: Take advantage of type narrowing for better development experience
4. **Provide meaningful error states**: Include enough context in error states for debugging
5. **Consider progress tracking**: Use the `progress` property for long-running operations
6. **Design for state transitions**: Structure your UI to handle state changes smoothly

## Related Functions

- [`isSuccess`](./is-success.md) - Type guard for success state
- [`isError`](./is-error.md) - Type guard for error state
- [`isPending`](./is-pending.md) - Type guard for pending state
- [`isInit`](./is-init.md) - Type guard for initial state
- [`IntrigProvider`](./intrig-provider.md) - Context provider for network state management

## Troubleshooting

### Common Issues

**Issue**: TypeScript complains about missing state handling
```typescript
// ❌ Bad - not exhaustive
function render(state: NetworkState<User>) {
  if (isSuccess(state)) {
    return React.createElement(UserList, { users: state.data });
  }
  // Missing other states
}

// ✅ Good - handle all states
function render(state: NetworkState<User>) {
  if (isInit(state)) return React.createElement(LoadButton);
  if (isPending(state)) return React.createElement(Loading);
  if (isSuccess(state)) return React.createElement(UserList, { users: state.data });
  if (isError(state)) return React.createElement(ErrorMessage, { error: state.error });
  return null;
}
```

**Issue**: Accessing properties without type guards
```typescript
// ❌ Bad - data might not exist
const name = response.data.name;

// ✅ Good - use type guards
if (isSuccess(response)) {
  const name = response.data.name;
}
```

**Issue**: Not handling state transitions
```typescript
// ✅ Include state in dependencies to handle transitions
useEffect(() => {
  if (isSuccess(dataState)) {
    // Handle success
  }
}, [dataState]); // Important: include state in dependencies
```