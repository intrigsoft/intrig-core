# State Management in Intrig

This page explains how Intrig models the lifecycle of network interactions using a compact algebraic data type called **`NetworkState`**. You’ll learn the four states, what each one carries, how transitions happen, how to read them safely with type guards, and how Intrig isolates state in a key–value store.

---

## What is `NetworkState`?

`NetworkState<T, E>` is an algebraic data type (ADT) that represents exactly one of four mutually exclusive states for an async operation:

* **`init`** – the call hasn’t started yet.
* **`pending`** – the call is in progress (optionally with progress and/or intermediate events in SSE).
* **`success`** – the call finished successfully and carries the response data (and optional headers).
* **`error`** – the call failed and carries error info (and optional status code and request context).

---

### Why an Algebraic Data Type?

Intrig models network results as an **algebraic data type** so a request is **always exactly one** of a closed set of shapes: `init`, `pending`, `success`, or `error`. This avoids the ambiguity of “flag soup” (`isLoading`, `hasError`, `data?`) where contradictory combinations can exist (e.g., `isLoading && hasError`). With an ADT, each variant owns only the fields it needs (e.g., `data` only on `success`, `error` only on `error`), making state **predictable**, **composable**, and easy to reason about.

## Lifecycle at a glance

<figure className="figure--center">
  <img
    src="/img/intrig-state-diagrams.svg"
    alt="Network State Lifecycle Diagram"
    width="50%"
    className="figure__img--diagram"
  />
  <figcaption className="figure__caption">
    The NetworkState lifecycle showing transitions between init, pending, success and error states
  </figcaption>
</figure>

The diagram above shows the typical flow:

1. Start at **`init`**.
2. On execution, move to **`pending`**.
3. Resolve to **`success`** (with `data`) or **`error`** (with `error`).
4. You may **reset** to `init` at any time (e.g., when a component unmounts and `clearOnUnmount` is enabled in hook options).

---

## State shapes (what each state carries)

### `init`

* **Purpose:** nothing started yet.
* **Shape:** `{ state: 'init' }`
* **Guard:** `isInit(state)`

### `pending`

* **Purpose:** an in-flight request.
* **Shape:** `{ state: 'pending', progress?: { type?: 'upload' | 'download', loaded: number, total?: number }, data?: T }`
* **Notes:**

* `progress` is available for uploads/downloads when the transport can report it.
* In **SSE hooks**, `data` carries the current stream payload (or an accumulator of events).
* **Guard:** `isPending(state)`

### `success`

* **Purpose:** a completed, successful request.
* **Shape:** `{ state: 'success', data: T, headers?: Record<string, any | undefined> }`
* **Notes:**

* `headers` lets you consume metadata like pagination cursors, rate-limit info, etc.
* **Guard:** `isSuccess(state)`

### `error`

* **Purpose:** a completed request with failure.
* **Shape:** `{ state: 'error', error: E, statusCode?: number, request?: any }`
* **Notes:**

* `error` is generic. When Intrig validates responses with Zod, this may be a `ZodError` for schema failures; network or server errors will carry transport-specific objects.
* `statusCode` and `request` are optional diagnostics you can surface in error UIs or logs.
* **Guard:** `isError(state)`

---

## Reading state safely (type guards)

Type guards (`isInit`, `isPending`, `isSuccess`, `isError`) **safely narrow** the `NetworkState` union and encourage **exhaustive branching**. This keeps rendering logic honest: if a variant’s shape changes (or a new one is introduced), the compiler flags non‑exhaustive branches instead of failing at runtime. Prefer guards over manual `state.state === 'success'` checks or unsafe casts.

```ts
import { isInit, isPending, isSuccess, isError } from '@intrig/react/network-state';

function render(state: NetworkState<Product, unknown>) {
  if (isInit(state)) return <Empty />;                         // { state: 'init' }
  if (isPending(state)) return <Spinner progress={state.progress} />; // { state: 'pending', ... }
  if (isSuccess(state)) return <ProductView data={state.data} />;     // { state: 'success', data }
  if (isError(state)) return <ErrorView error={state.error} />;       // { state: 'error', error }

  // Exhaustiveness check — compiler will complain if a variant isn’t handled
  const _exhaustive: never = state as never;
  return null;
}
```

**Why guards?**

* **Compile‑time safety:** UI branches fail fast during refactors.
* **Clarity:** Each branch gets the correctly narrowed type (no optional chaining soup).
* **Consistency:** Shared pattern across hooks and components.

These guards allow precise, exhaustiveness‑friendly UI without unsafe casts.

## Progress reporting

When supported by the underlying transport, `pending.progress` exposes:

* `type`: `'upload' | 'download'` (optional)
* `loaded`: bytes transferred so far
* `total`: total bytes if known

This enables rich progress bars and ETA calculations. If progress is not reported by the transport, `progress` remains `undefined`.

---

## Headers on success

`success.headers` provides response metadata (e.g., pagination cursors, ETags, rate-limit buckets). Prefer reading structured data from `data` and reserve `headers` for protocol concerns.

---

## Error semantics

The `error` variant is generic in `E`. Common cases include:

* **Validation errors:** `ZodError` when the decoded response doesn’t match the expected schema.
* **Transport errors:** e.g., Axios errors with nested `response`/`request` fields.
* **Domain errors:** server-provided problem objects.

Your UI can pattern-match on `statusCode` or inspect the error shape to tailor messages. Avoid stringifying and dropping structure; prefer rendering actionable details.

---

## Where is state stored?

Intrig keeps all network states in a **key–value store** maintained by the provider. Each entry is isolated by a **compound key**:

```
(sourceId, operationId, key)
```

* **`sourceId`** – the API source you configured in the provider (e.g., `productApi`).
* **`operationId`** – the OpenAPI operation identifier for the endpoint.
* **`key`** – a developer-provided discriminator from hook options (defaults to `'default'`). Use different keys to keep multiple, independent instances of the same endpoint in memory (e.g., compare two products side-by-side).

This scheme provides **sufficient isolation**: two calls to the same operation won’t collide unless they intentionally share the same `key`.

> Example use cases for custom keys
>
> * Tabs/lists showing multiple instances of the same resource
> * Master–detail pages caching different selections
> * Parallel forms submitting to the same endpoint

---

## Working with generated hooks

Intrig’s generated hooks read and write `NetworkState` behind the scenes. Typical patterns:

```tsx
const productId = props.id;
const key = `product-${productId}`;

const state = useGetProductState({ key }); // read-only selector for the state
const [network, fetch, clear] = useGetProduct({
  key,
  fetchOnMount: true,
  params: { id: productId },
});

if (isPending(network)) return <Spinner progress={network.progress} />;
if (isError(network)) return <ErrorView error={network.error} />;
if (isSuccess(network)) return <ProductView data={network.data} />;
return <Empty />; // init
```

* **`key`** keeps this instance isolated in the store.
* **`fetchOnMount`** moves state from `init` → `pending` automatically when the component mounts.
* **`clear()`** resets to `init`; when `clearOnUnmount` is enabled in options, Intrig will do this automatically.

> **Tip:** Keep render branches **exhaustive** using the guards to avoid accidental fallthroughs when introducing new UI states.

---

## FAQ

**Q: Can I read raw headers on success?**
Yes, via `state.headers`. Prefer using typed fields in `data` when possible.

**Q: What error type should I expect?**
It depends. Validation failures often yield `ZodError`; transport errors retain their native shape. Use `statusCode` and error narrowing as needed.

**Q: How do I fully reset state?**
Call the provided `clear()` from hooks or enable `clearOnUnmount` so Intrig resets to `init` automatically when components unmount.

---

## References

For detailed type definitions and guard signatures, please refer to the **Reference Section** of the documentation.
