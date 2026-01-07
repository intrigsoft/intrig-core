# Error Handling

Intrig distinguishes between multiple error types to enable precise error handling. When `isError(state)` is true, `state.error` contains an `IntrigError` — a discriminated union with a `type` field.

## State Transitions

NetworkState transitions follow a predictable state machine:

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

Errors can occur during the transition from `pending` to `error`, and can be recovered by calling `execute()` again or `clear()` to reset to init state.

## Error Types

### HttpError

Server returned a non-2xx status code.

```typescript
interface HttpError {
  type: 'http';
  status: number;        // HTTP status code (e.g., 404, 500)
  url: string;           // Request URL
  method: string;        // HTTP method (GET, POST, etc.)
  headers?: Record<string, any>;  // Response headers
  body?: unknown;        // Parsed error response body (if errorSchema provided)
}
```

**When it occurs:**
- Server responds with 4xx or 5xx status codes
- API returns structured error responses

### NetworkError

Request failed at the transport layer — no response received.

```typescript
interface NetworkError {
  type: 'network';
  reason: 'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown';
  request?: any;         // The request that failed
}
```

**Reason values:**
| Reason | Description |
|--------|-------------|
| `timeout` | Request timed out |
| `dns` | DNS resolution failed |
| `offline` | Device is offline |
| `aborted` | Request was cancelled |
| `unknown` | Unspecified network issue |

### RequestValidationError

Request body failed Zod schema validation before being sent.

```typescript
interface RequestValidationError {
  type: 'request-validation';
  error: ZodError;       // Zod validation error with field-level details
}
```

**When it occurs:**
- Request body doesn't match the expected schema
- Required fields are missing or have wrong types

### ResponseValidationError

Success response (2xx) failed Zod schema validation.

```typescript
interface ResponseValidationError {
  type: 'response-validation';
  error: ZodError;       // Zod validation error
  raw?: unknown;         // The unparsed response data for debugging
}
```

**When it occurs:**
- API returned 2xx but response shape doesn't match schema
- Typically indicates API version mismatch

### ConfigError

SDK configuration issue.

```typescript
interface ConfigError {
  type: 'config';
  message: string;       // Error description
}
```

**When it occurs:**
- Unknown API source referenced
- Missing or invalid configuration

## Error Type Guards

Each error type has a corresponding type guard for TypeScript narrowing:

```typescript
import {
  isError,
  isHttpError,
  isNetworkError,
  isRequestValidationError,
  isResponseValidationError,
  isConfigError
} from '@intrig/react';

if (isError(state)) {
  const { error } = state;

  if (isHttpError(error)) {
    // error.status, error.url, error.method, error.body available
  } else if (isNetworkError(error)) {
    // error.reason, error.request available
  } else if (isRequestValidationError(error)) {
    // error.error (ZodError) available
  } else if (isResponseValidationError(error)) {
    // error.error, error.raw available
  } else if (isConfigError(error)) {
    // error.message available
  }
}
```

Type guards narrow the `IntrigError` union to the specific error type, enabling type-safe access to error-specific properties.

## Dispatch Validation

The execute function returns a `DispatchState` indicating whether the request was dispatched:

```typescript
import { isValidationError, isSuccessfulDispatch } from '@intrig/react';

const [state, createEmployee, clear] = useCreateEmployee();

function handleSubmit(data: EmployeeData) {
  const result = createEmployee(data, params);

  if (isValidationError(result)) {
    // Request body failed validation, was NOT sent
    console.log(result.error); // Zod issues array
    return;
  }

  if (isSuccessfulDispatch(result)) {
    // Request was dispatched, watch state for result
  }
}
```

This allows immediate feedback on client-side validation failures without waiting for the network state to update.

**DispatchState vs NetworkState:**
| Aspect | DispatchState | NetworkState |
|--------|---------------|--------------|
| When available | Immediately after execute() | Asynchronously via state |
| What it tells you | Was the request sent? | What happened to the request? |
| Validation errors | Pre-flight validation failures | Server-side or response validation |

## Typed Error Responses

Hooks accept an `errorSchema` to parse non-2xx response bodies:

```typescript
// Generated hook with errorSchema
const [state, execute, clear] = useCreateEmployee();

if (isError(state) && isHttpError(state.error)) {
  // state.error.body is typed according to errorSchema
  const errorResponse = state.error.body as ApiErrorResponse;

  if (errorResponse.code === 'DUPLICATE_EMAIL') {
    // Handle specific error
  }
}
```

When `errorSchema` validation fails on the error response, you get a `ResponseValidationError` instead of `HttpError`.

## Error Recovery

**Retry after error:**
```typescript
// Simply call execute again
execute(params);
```

**Reset to initial state:**
```typescript
// Clears error and aborts any pending request
clear();
```

**Check if can retry:**
```typescript
if (isError(state)) {
  // Safe to retry or clear
}
```

## Common Patterns

### Comprehensive Error Handling

```tsx
import {
  isError,
  isHttpError,
  isNetworkError,
  isRequestValidationError,
  isResponseValidationError,
  isConfigError,
  NetworkState
} from '@intrig/react';

function ErrorDisplay({
  state,
  onRetry
}: {
  state: NetworkState<any>;
  onRetry: () => void;
}) {
  if (!isError(state)) return null;

  const { error } = state;

  if (isHttpError(error)) {
    if (error.status === 401) return <Redirect to="/login" />;
    if (error.status === 404) return <NotFound />;
    if (error.status >= 500) {
      return <ServerError onRetry={onRetry} />;
    }
    return <ApiError message={(error.body as any)?.message} />;
  }

  if (isNetworkError(error)) {
    if (error.reason === 'offline') return <OfflineNotice />;
    if (error.reason === 'timeout') {
      return <TimeoutRetry onRetry={onRetry} />;
    }
    return <NetworkFailure />;
  }

  if (isRequestValidationError(error)) {
    return <FormErrors issues={error.error.issues} />;
  }

  if (isResponseValidationError(error)) {
    // API returned unexpected shape — likely API version mismatch
    console.error('Response validation failed:', error.raw);
    return <UnexpectedResponse />;
  }

  if (isConfigError(error)) {
    // Developer error — should not happen in production
    console.error('Config error:', error.message);
    return <ConfigurationError />;
  }

  return null;
}
```

### Form Validation Feedback

```tsx
import { isValidationError } from '@intrig/react';

function EmployeeForm() {
  const [state, submit] = useCreateEmployee();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(data: FormData) {
    const result = submit(data);

    if (isValidationError(result)) {
      // Map Zod issues to form fields
      const errors = result.error.reduce(
        (acc: Record<string, string>, issue: any) => {
          acc[issue.path.join('.')] = issue.message;
          return acc;
        },
        {}
      );
      setFieldErrors(errors);
      return;
    }

    // Request dispatched, clear previous errors
    setFieldErrors({});
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }}>
      <input name="email" />
      {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}

      <input name="name" />
      {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}

      <button type="submit">Create</button>
    </form>
  );
}
```

### Central Error Handling with useCentralError

```tsx
import { useCentralError, isHttpError, isNetworkError } from '@intrig/react';

function GlobalErrorBoundary() {
  const errors = useCentralError();

  // errors is array of ErrorWithContext:
  // { error, source, operation, key }

  if (errors.length === 0) return null;

  return (
    <div className="error-toast-container">
      {errors.map(err => (
        <Toast key={`${err.source}:${err.operation}:${err.key}`}>
          {formatError(err.error)}
        </Toast>
      ))}
    </div>
  );
}

function formatError(error: IntrigError): string {
  if (isHttpError(error)) {
    return `Request failed: ${error.status} ${error.method} ${error.url}`;
  }
  if (isNetworkError(error)) {
    return `Network error: ${error.reason}`;
  }
  return 'An error occurred';
}
```

### HTTP Status Code Handling

```tsx
function useErrorHandler() {
  return useCallback((state: NetworkState<any>) => {
    if (!isError(state)) return null;

    const { error } = state;

    if (!isHttpError(error)) return null;

    switch (error.status) {
      case 400:
        return { type: 'validation', message: 'Invalid request data' };
      case 401:
        return { type: 'auth', message: 'Please log in' };
      case 403:
        return { type: 'permission', message: 'Access denied' };
      case 404:
        return { type: 'notFound', message: 'Resource not found' };
      case 409:
        return { type: 'conflict', message: 'Resource already exists' };
      case 422:
        return { type: 'unprocessable', message: 'Validation failed' };
      case 429:
        return { type: 'rateLimit', message: 'Too many requests' };
      default:
        if (error.status >= 500) {
          return { type: 'server', message: 'Server error, please try again' };
        }
        return { type: 'unknown', message: 'Request failed' };
    }
  }, []);
}
```

## SSE Stream Errors

For Server-Sent Events, validation errors can occur per-chunk:

- If a chunk fails JSON parsing when `schema` is defined, the stream transitions to `ResponseValidationError`
- If a parsed chunk fails schema validation, you get a `ResponseValidationError`

The stream will stop and transition to error state when validation fails.

```tsx
const [streamState] = useStreamUpdates({ fetchOnMount: true });

if (isError(streamState)) {
  if (isResponseValidationError(streamState.error)) {
    // A streamed chunk failed validation
    console.error('Invalid chunk received:', streamState.error.raw);
  }
}
```

## Type Signatures

```typescript
// Error type guards
function isHttpError(error: IntrigError): error is HttpError;
function isNetworkError(error: IntrigError): error is NetworkError;
function isRequestValidationError(error: IntrigError): error is RequestValidationError;
function isResponseValidationError(error: IntrigError): error is ResponseValidationError;
function isConfigError(error: IntrigError): error is ConfigError;

// Dispatch state guards
function isValidationError<T>(value: DispatchState<T>): value is ValidationError<T>;
function isSuccessfulDispatch<T>(value: DispatchState<T>): value is SuccessfulDispatch<T>;

// Central error hook
function useCentralError(): ErrorWithContext[];
```

## Related

- [NetworkState](./api/network-state.md) — Complete state type reference
- [Type Guards](./api/type-guards.md) — State type guards (isInit, isPending, isSuccess, isError)
- [Stateful Hooks](./api/stateful-hook.md) — Hooks that return NetworkState
