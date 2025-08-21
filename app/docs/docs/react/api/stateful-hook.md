# Stateful Hook

Stateful hooks are generated hooks that bind an API operation to Intrig’s shared store. Use them when you need a cached, reusable result that other components can observe. They return the current network state and helper functions to execute or clear the request.

---

## Overview

All stateful hooks follow a **tuple structure**:

```ts
const [state, execute, clear] = useSomeEndpoint(/* options */);
```

1. **`state`** → A `NetworkState<T>` representing the current status (`init`, `pending`, `success`, `error`).
2. **`execute`** → A typed function that dispatches the request.
3. **`clear`** → Cancels any in-flight request and resets state to `init`.

Each hook also carries a static `key: string` that identifies its store slot (e.g., `"productApi: GET /users/{id}"`).

---

## Type Signatures

Source of truth: `@intrig/react` → `network-state.tsx`

### Core Types

* `NetworkState<T>` — union of `init | pending | success | error`
* Type guards: `isInit`, `isPending`, `isSuccess`, `isError`

### Hook Options

Control lifecycle behavior:

| Option           | Type/Default         | Description                                                 |
| ---------------- | -------------------- | ----------------------------------------------------------- |
| `key`            | `string = "default"` | Isolate results across multiple uses of the same hook.      |
| `fetchOnMount`   | `boolean = false`    | Auto-fetch once on mount (requires `params` and/or `body`). |
| `clearOnUnmount` | `boolean = false`    | Reset state to `init` on unmount.                           |
| `params`         | Depends on hook      | Required when `fetchOnMount: true`.                         |
| `body`           | Depends on hook      | Required for binary hooks when `fetchOnMount: true`.        |

### Hook Templates

* **Unary (params only):**

  ```ts
  type UnaryFunctionHook<P, T> =
    (options?: UnaryHookOptions<P>) => [
      NetworkState<T>,
      (params: P) => DispatchState<any>,
      () => void
    ] & { key: string }
  ```

* **Binary (params + body):**

  ```ts
  type BinaryFunctionHook<P, B, T> =
    (options?: BinaryHookOptions<P, B>) => [
      NetworkState<T>,
      (body: B, params: P) => DispatchState<any>,
      () => void
    ] & { key: string }
  ```

Other variations (`UnitHook`, `ConstantHook<T>`, `UnaryProduceHook<P>`, `BinaryProduceHook<P, B>`) follow the same tuple pattern with `never` or `void` where applicable.

---

## Constraints & Behavior

* **Global store** — Results are cached in `IntrigProvider`’s keyed store.
* **Lifecycle control** — `fetchOnMount` and `clearOnUnmount` manage mount/unmount behaviors.
* **Validation** — If schemas exist, Intrig validates responses. Invalid payloads produce a `response-validation` error.
* **Progress** — Pending states may include `progress` for upload/download tracking.
* **Concurrency** — Calling `execute` again aborts the previous request and updates the same store slot.

---

## Reading State Safely

Use type guards to avoid unsafe reads:

```ts
import { isPending, isError, isSuccess } from '@intrig/react';

if (isPending(state)) return <Spinner />;
if (isError(state))   return <ErrorView />;
if (isSuccess(state)) return <DataView data={state.data} />;
```

---

## Examples

### Unary (params only)

```ts
const [userResp, getUser, clearUser] = useGetUser({
  fetchOnMount: true,
  clearOnUnmount: true,
  params: { id: "42" }
});

// later
getUser({ id: "42" });
clearUser();
```

### Binary (params + body)

```ts
const [createResp, createUser, clearUser] = useCreateUser();

createUser({ name: "Ada" }, { orgId: "acme" });
```

---

This structure is consistent across all stateful hooks, making them predictable, reusable, and type-safe.
