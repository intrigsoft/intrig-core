# Type Guards

```tsx
import { isInit, isPending, isSuccess, isError } from '@intrig/react/network-state';

const [users] = useGetUsers({ fetchOnMount: true });

if (isInit(users)) return <LoadButton />;
if (isPending(users)) return <Spinner />;
if (isError(users)) return <ErrorView error={users.error} />;
if (isSuccess(users)) return <UserList data={users.data} />;
```

Type guards safely narrow `NetworkState` to specific variants, enabling type-safe access to state properties.

## Available Guards

| Function | Narrows To | Use Case |
|----------|-----------|----------|
| `isInit(state)` | `InitState<T>` | Check if request hasn't started |
| `isPending(state)` | `PendingState<T>` | Show loading UI, access progress |
| `isSuccess(state)` | `SuccessState<T>` | Access `data` safely |
| `isError(state)` | `ErrorState<T>` | Handle errors with `error` |

## isInit

Check if request hasn't started yet:

```tsx
function ProductView() {
  const [product] = useGetProduct();

  if (isInit(product)) {
    // TypeScript knows: { state: 'init' }
    return (
      <div>
        <button onClick={() => fetchProduct({ id: productId })}>
          Load Product
        </button>
      </div>
    );
  }

  // Handle other states...
}
```

**State shape:**
```typescript
{ state: 'init' }
```

**When it's true:**
- Component just mounted (without `fetchOnMount`)
- State was cleared with `clear()`
- State reset by `clearOnUnmount`

## isPending

Check if request is in progress:

```tsx
function UserList() {
  const [users] = useGetUsers({ fetchOnMount: true });

  if (isPending(users)) {
    // TypeScript knows: { state: 'pending', progress?: Progress, data?: T }

    // Show progress for uploads/downloads
    if (users.progress) {
      const percentage = users.progress.total
        ? Math.round((users.progress.loaded / users.progress.total) * 100)
        : 0;

      return <ProgressBar value={percentage} />;
    }

    return <LoadingSpinner />;
  }

  // Handle other states...
}
```

**State shape:**
```typescript
{
  state: 'pending',
  progress?: {
    type?: 'upload' | 'download',
    loaded: number,
    total?: number
  },
  data?: T  // For SSE streams
}
```

**When it's true:**
- Request is in flight
- Upload/download in progress
- SSE stream is active

**Progress tracking:**
```tsx
if (isPending(uploadState) && uploadState.progress) {
  const { loaded, total, type } = uploadState.progress;

  return (
    <div>
      <span>{type === 'upload' ? 'Uploading' : 'Downloading'}</span>
      <progress value={loaded} max={total} />
      <span>{loaded} / {total} bytes</span>
    </div>
  );
}
```

## isSuccess

Check if request completed successfully:

```tsx
function ProductDetails() {
  const [product] = useGetProduct({ fetchOnMount: true });

  if (isSuccess(product)) {
    // TypeScript knows: { state: 'success', data: T, headers?: Record<string, any> }

    // Safe access to data
    return (
      <div>
        <h1>{product.data.name}</h1>
        <p>{product.data.description}</p>
        <Price amount={product.data.price} />

        {/* Access response headers if needed */}
        {product.headers?.['x-rate-limit-remaining'] && (
          <div>API calls remaining: {product.headers['x-rate-limit-remaining']}</div>
        )}
      </div>
    );
  }

  // Handle other states...
}
```

**State shape:**
```typescript
{
  state: 'success',
  data: T,
  headers?: Record<string, any | undefined>
}
```

**When it's true:**
- Request completed without errors
- Response validated against OpenAPI schema (if enabled)
- Data is ready for use

**Accessing headers:**
```tsx
if (isSuccess(users)) {
  const nextPageToken = users.headers?.['x-next-page'];
  const rateLimit = users.headers?.['x-rate-limit-remaining'];
  const etag = users.headers?.['etag'];

  return (
    <>
      <UserList data={users.data} />
      {nextPageToken && <LoadMoreButton token={nextPageToken} />}
    </>
  );
}
```

## isError

Check if request failed:

```tsx
function OrderForm() {
  const [orderResult, createOrder] = useCreateOrder();

  if (isError(orderResult)) {
    // TypeScript knows: { state: 'error', error: E, statusCode?: number, request?: any }

    // Handle different error types
    if (orderResult.statusCode === 400) {
      return <ValidationError error={orderResult.error} />;
    }

    if (orderResult.statusCode === 401) {
      return <LoginPrompt />;
    }

    if (orderResult.statusCode === 403) {
      return <PermissionDenied />;
    }

    if (orderResult.statusCode && orderResult.statusCode >= 500) {
      return <ServerError error={orderResult.error} />;
    }

    // Network or unknown error
    return (
      <div>
        <ErrorMessage error={orderResult.error} />
        <button onClick={() => createOrder(orderData)}>Retry</button>
      </div>
    );
  }

  // Handle other states...
}
```

**State shape:**
```typescript
{
  state: 'error',
  error: E,
  statusCode?: number,
  request?: any
}
```

**When it's true:**
- Network error occurred
- Server returned error status (4xx, 5xx)
- Response failed OpenAPI schema validation
- Request failed validation

**Error types:**
- **Network errors** - No `statusCode`, connection failed
- **HTTP errors** - Has `statusCode`, server returned error
- **Validation errors** - Response didn't match OpenAPI schema

## Exhaustive Pattern Matching

Type guards enable exhaustive checking:

```tsx
function renderState<T>(state: NetworkState<T>) {
  if (isInit(state)) {
    return <InitView />;
  }

  if (isPending(state)) {
    return <LoadingView />;
  }

  if (isSuccess(state)) {
    return <DataView data={state.data} />;
  }

  if (isError(state)) {
    return <ErrorView error={state.error} />;
  }

  // TypeScript enforces all states are handled
  const _exhaustive: never = state;
  return null;
}
```

TypeScript will error if you miss a state or if a new state is added.

## Complete Example

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, fetchUser, clearUser] = useGetUser({
    fetchOnMount: true,
    clearOnUnmount: true,
    params: { id: userId }
  });

  // Initial state - show load button
  if (isInit(user)) {
    return (
      <div>
        <p>User profile not loaded</p>
        <button onClick={() => fetchUser({ id: userId })}>Load Profile</button>
      </div>
    );
  }

  // Loading state - show spinner
  if (isPending(user)) {
    return (
      <div>
        <Spinner />
        <p>Loading user profile...</p>
      </div>
    );
  }

  // Error state - show error with retry
  if (isError(user)) {
    return (
      <div>
        <h2>Error Loading Profile</h2>

        {user.statusCode === 404 && <p>User not found</p>}
        {user.statusCode === 403 && <p>You don't have permission to view this profile</p>}
        {!user.statusCode && <p>Network error - check your connection</p>}
        {user.statusCode && user.statusCode >= 500 && <p>Server error - try again later</p>}

        <button onClick={() => fetchUser({ id: userId })}>Retry</button>
        <button onClick={clearUser}>Clear</button>
      </div>
    );
  }

  // Success state - show user data
  if (isSuccess(user)) {
    return (
      <div>
        <img src={user.data.avatar} alt={user.data.name} />
        <h1>{user.data.name}</h1>
        <p>{user.data.email}</p>
        <p>Member since: {new Date(user.data.createdAt).toLocaleDateString()}</p>

        <button onClick={() => fetchUser({ id: userId })}>Refresh</button>
      </div>
    );
  }

  // Exhaustiveness check
  return null;
}
```

## Why Type Guards

**Without type guards (unsafe):**
```tsx
// ✗ Bad - TypeScript can't guarantee data exists
const name = users.data.name; // Error: data might not exist

// ✗ Bad - Optional chaining everywhere
const name = users.data?.name;
const email = users.data?.email;
```

**With type guards (safe):**
```tsx
// ✓ Good - TypeScript knows data exists in this branch
if (isSuccess(users)) {
  const name = users.data.name;   // No optional chaining needed
  const email = users.data.email; // TypeScript knows these exist
}
```

## Type Signatures

```typescript
function isInit<T, E = unknown>(
  state: NetworkState<T, E>
): state is InitState<T, E>

function isPending<T, E = unknown>(
  state: NetworkState<T, E>
): state is PendingState<T, E>

function isSuccess<T, E = unknown>(
  state: NetworkState<T, E>
): state is SuccessState<T, E>

function isError<T, E = unknown>(
  state: NetworkState<T, E>
): state is ErrorState<T, E>
```

## Related

- [NetworkState](./network-state.md) - Complete state type reference
- [Stateful Hooks](./stateful-hook.md) - Hooks that return NetworkState
- [State Management](../core-concepts/state-management) - How state works globally
