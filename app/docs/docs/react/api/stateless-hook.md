# Stateless (Async) Hook

Stateless hooks are **promise-returning variants** used for one-off actions such as form submissions, validations, or quick checks.
Unlike stateful hooks, they **do not cache results** in Intrig’s global store. Use them when you only need the immediate result (or error) and will manage UI state yourself.

---

## Overview

All stateless hooks follow a **tuple structure**:

```ts
const [call, abort] = useSomeEndpointAsync();
```

1. **`call`** → A function that returns a `Promise<T>` (or `Promise<void>` for produce variants).
2. **`abort`** → Cancels the last in-flight request for this hook instance.

Each hook also carries a static `key: string` for request tracking (e.g., `"productApi: POST /users"`).

---

## Type Signatures

Source of truth: `@intrig/react` → `network-state.tsx`

### Async Hook Templates

* **Unary (params only)**

  ```ts
  type UnaryFunctionAsyncHook<P, T> =
    () => [(params: P) => Promise<T>, () => void] & { key: string }
  ```

* **Binary (params + body)**

  ```ts
  type BinaryFunctionAsyncHook<P, B, T> =
    () => [(body: B, params: P) => Promise<T>, () => void] & { key: string }
  ```

* **Produce variants (no return data)**

  ```ts
  type UnaryProduceAsyncHook<P> =
    () => [(params: P) => Promise<void>, () => void] & { key: string }

  type BinaryProduceAsyncHook<P, B> =
    () => [(body: B, params: P) => Promise<void>, () => void] & { key: string }
  ```

---

## Constraints & Behavior

| Aspect            | Behavior                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global store**  | Not used — you manage local state manually.                                                                                                        |
| **Single-flight** | Starting a new `call` aborts the previous in-flight request for this instance.                                                                     |
| **Validation**    | If schemas exist, responses are validated. Failures reject with `response-validation`. Request validation errors reject with `request-validation`. |
| **Error model**   | All rejections use Intrig error types (`http`, `network`, `request-validation`, `response-validation`, `config`).                                  |

---

## Examples

### Unary (params only)

```ts
const [submit, abort] = useCreateIssueAsync();

try {
  const result = await submit({ projectId: "acme" });
  // handle result
} catch (e) {
  // handle error
}
```

### Binary (params + body)

```ts
const [save, abort] = useUpdateUserAsync();

await save({ name: "Ada" }, { id: "42" });
```

---

## When to Prefer Stateless

* One-off actions where you don’t need to share results later.
* Validations or quick checks where only success/failure matters.
* Mutations where the response doesn’t need to persist in the global store.
