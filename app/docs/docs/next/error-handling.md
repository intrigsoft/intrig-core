# Error Handling

Next.js error handling differs from React due to its layered architecture. Understanding where errors originate and how they're transformed is key to effective error handling.

## Architecture Overview

```
Client Component ──► Generated Route ──► Server Function ──► External API
                            │
                     (normalizes errors)

Server Component ──────────────────────► Server Function ──► External API
                                                │
                                         (throws on error)
```

- **Client-side**: Hooks call generated API routes, which call server functions, which call external APIs. Errors are normalized by the route layer before reaching the client.
- **Server-side**: Server functions can be called directly from Server Components or during SSR. Errors surface as thrown exceptions.

## Client-Side Error Handling

Client-side hooks receive the same error types as the React SDK. When `isError(state)` is true, `state.error` is an `IntrigError`.

### Error Types

All errors surface as `HttpError` on the client because the route layer transforms exceptions into HTTP responses:

| Original Error | Route Response | Client Receives |
|----------------|----------------|-----------------|
| AxiosError (4xx/5xx) | JSON with original status | `HttpError` with API's status and body |
| ZodError (validation) | 400 with `{ errors: [...] }` | `HttpError` with status 400 |
| Unknown exception | 500 with error details | `HttpError` with status 500 |

### Type Guards

```typescript
import { isError, isHttpError } from '@intrig/next';

const [state, execute, clear] = useGetEmployee();

if (isError(state) && isHttpError(state.error)) {
  const { status, body } = state.error;

  if (status === 400 && body?.errors) {
    // Validation error from route layer
    const fieldErrors = body.errors as Array<{ path: string; message: string }>;
  } else if (status === 401) {
    // Unauthorized
  } else if (status >= 500) {
    // Server error
  }
}
```

### Validation Error Shape

When the route layer catches a ZodError, it returns:

```typescript
{
  errors: Array<{
    path: string;    // Dot-notation field path (e.g., "user.email")
    message: string; // Validation message
  }>
}
```

### Request Validation

Like React, the execute function returns a `DispatchState` for immediate validation feedback:

```typescript
import { isValidationError, isSuccessfulDispatch } from '@intrig/next';

const result = createEmployee(data, params);

if (isValidationError(result)) {
  // Request not sent — validation failed client-side
  console.log(result.error);
}
```

### Error Display Component

```tsx
import { isError, isHttpError, NetworkState } from '@intrig/next';

function ApiError({ state }: { state: NetworkState<any> }) {
  if (!isError(state)) return null;

  const { error } = state;
  if (!isHttpError(error)) return null;

  const { status, body } = error;

  // Route-layer validation error
  if (status === 400 && Array.isArray(body?.errors)) {
    return (
      <ul>
        {body.errors.map((err: { path: string; message: string }, i: number) => (
          <li key={i}>{err.path}: {err.message}</li>
        ))}
      </ul>
    );
  }

  // API error with message
  if (body?.message) {
    return <p>{body.message}</p>;
  }

  // Generic HTTP error
  return <p>Request failed with status {status}</p>;
}
```

## Server-Side Error Handling

Server functions throw exceptions on failure. Use standard try/catch patterns.

### Error Types

Server functions throw raw `AxiosError` from the underlying HTTP client:

```typescript
import { AxiosError, isAxiosError } from 'axios';

try {
  const { data } = await getEmployee({ id });
} catch (e) {
  if (isAxiosError(e)) {
    const status = e.response?.status;
    const body = e.response?.data;
    // Handle based on status/body
  }
}
```

### Server Component Example

```typescript
// app/employees/[id]/page.tsx
import { getEmployee } from '@intrig/next/employee_api/employees/getEmployee';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';

export default async function EmployeePage({ params }: { params: { id: string } }) {
  try {
    const { data: employee } = await getEmployee({ id: params.id });
    return <EmployeeDetails employee={employee} />;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      notFound();
    }
    throw e; // Let error boundary handle
  }
}
```

### Server Action Example

```typescript
'use server';

import { createEmployee } from '@intrig/next/employee_api/employees/createEmployee';
import { isAxiosError } from 'axios';

export async function createEmployeeAction(formData: FormData) {
  try {
    const { data } = await createEmployee({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
    return { success: true, data };
  } catch (e) {
    if (isAxiosError(e)) {
      return {
        success: false,
        status: e.response?.status,
        error: e.response?.data
      };
    }
    return { success: false, error: 'Unknown error' };
  }
}
```

## Error Boundary Integration

For unhandled errors in Server Components, use Next.js error boundaries:

```typescript
// app/employees/error.tsx
'use client';

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Failed to load employee</h2>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
```

## Client vs Server Comparison

| Aspect | Client-Side | Server-Side |
|--------|-------------|-------------|
| Error source | `state.error` (after route normalization) | Thrown exception |
| Primary type | `HttpError` | `AxiosError` |
| Validation errors | `HttpError` with 400 status | Thrown before request |
| Type guards | `isHttpError()`, etc. | `isAxiosError()` |
| Recovery | `clear()` and re-execute | Retry in catch block |

## Imports Summary

```typescript
// Client-side (same as React)
import {
  isError,
  isHttpError,
  isValidationError,
  isSuccessfulDispatch
} from '@intrig/next';

// Server-side
import { isAxiosError } from 'axios';
```

## Related

- [NetworkState](./api/network-state.md) — Complete state type reference
- [React Error Handling](../react/error-handling.md) — React-specific error patterns
