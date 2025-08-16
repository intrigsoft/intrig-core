# Stateful vs Stateless Hooks

This page explains the two fundamental hook styles Intrig generates for REST endpoints and when to choose each. If you’re building with Intrig, you’ll use one of these for every call.

---

## TL;DR

* **Stateful hooks** keep a **`NetworkState`** in Intrig’s global store, keyed by endpoint and an optional `key`. They’re ideal for UI that needs loading/error/data to be **observable and persistent** across renders or components.
* **Stateless hooks** return `[call, clear]` and **don’t store** anything in Intrig. Invoke `call(body?, params?) → Promise<T>`; use `clear()` to drop any per‑hook transient state. Ideal for one‑off actions, form submits, and flows where you manage state yourself.

Use **stateful** for screens and widgets. Use **stateless** for actions.

---

## What exactly is a Stateful Hook?

A stateful hook wires an endpoint to Intrig’s global store. It exposes:

1. a **`NetworkState<T, E>`** value (init → pending → success/error),
2. a **`fetch`** function to execute the call, and
3. a **`clear`** function to reset the state back to `init`.

**Signature (conceptual):**

```ts
// P = params type, B = body type, T = response type
export type StatelessHook<P, B, T> = (requestOpts?: RequestOpts) => [
  (body?: B, params?: P) => Promise<T>,
  () => void
];
```

**Example:**

```tsx
const [saveProduct, clearSaveProduct] = useSaveProduct();

async function onSubmit(form: ProductForm) {
  try {
    const saved = await saveProduct(form);
    toast.success(`Saved #${saved.id}`);
  } catch (e) {
    toast.error("Couldn’t save product");
  }
}
```

**Example:**

```tsx
const [product, fetchProduct, clearProduct] = useGetProduct({
  key: `product:${id}`,
  fetchOnMount: true,
  params: { id },
});
```

The `product` value transitions through `init → pending → success/error`. Since it lives in a keyed global store, **other components can read the same state** (using the same hook + `key`).

### Hook Options (Stateful)

| Option           | Type      | Required  | Default     | What it does                                                                                                        |
| ---------------- | --------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `key`            | `string`  | No        | `'default'` | Namespaces the state for this endpoint. Use different keys to keep independent states (e.g., compare two products). |
| `clearOnUnmount` | `boolean` | No        | `false`     | If `true`, resets state to `init` when the component unmounts. Useful for temporary screens.                        |
| `fetchOnMount`   | `boolean` | No        | `false`     | If `true`, runs `fetch` once after mount using the provided `params`/`body`.                                        |
| `params`         | `P`       | **Yes**\* | —           | Required if `fetchOnMount` is `true`. Path/query parameters for the request.                                        |
| `body`           | `B`       | **Yes**\* | —           | Required if `fetchOnMount` is `true` **and** the endpoint accepts a body.                                           |

> \*Required only when you opt into `fetchOnMount`.
>
> See the **Lifecycle Binding** chapter for a deeper discussion of how `fetchOnMount` and `clearOnUnmount` relate to component lifecycles.

### When to use Stateful

* You need **loading** and **error** feedback visible in the UI.
* The same state should be **shared/reused** across components via `key`.
* You want **caching-like** behavior within the view’s lifetime (stay on screen → state sticks).
* You want to **reset** or **refetch** easily via `clear` / `fetch`.

### Patterns that shine

* **Detail pages** where data should remain visible across re-renders.
* **Master-detail** or **compare** views (use different `key`s per entity).
* **Polling / live-updating** widgets (fire `fetch` on an interval; state transitions are handled for you).

---

## What exactly is a Stateless Hook?

A stateless hook returns a **tuple** `[call, clear]`. `call` performs the request and resolves with the parsed result; nothing is stored in Intrig’s state store. You handle any local UI state yourself. `clear` lets you reset any per‑hook transient state or cancel in‑flight work.

**Signature (conceptual):**

```ts
// P = params type, B = body type, T = response type
export type StatelessHook<P, B, T> = (requestOpts?: RequestOpts) => [
  (body?: B, params?: P) => Promise<T>,
  () => void
]; // returns a function

async function onSubmit(form: ProductForm) {
  try {
    const saved = await saveProduct(undefined, { body: form });
    toast.success(`Saved #${saved.id}`);
  } catch (e) {
    toast.error("Couldn’t save product");
  }
}
```

### When to use Stateless

* **One-off actions** (create/update/delete) where you don’t need to display a persistent `NetworkState`.
* **Forms and wizards** where you control pending/success/error with your own local state.
* **Batch jobs / background actions** triggered by buttons or effects.
* **Asynchronous form validations** where you want to check values (like username availability) without persisting state.

### Why stateless can be safer for actions

* Work seamlessly with \*\*React’s \*\***`useTransition`** to mark async requests as non-blocking transitions, improving UX in forms and interactive flows.
* Avoids accidental **stale UI coupling**—there’s no global state to inadvertently read.
* Encourages **explicit success flows** (use the resolved value right away).
* Plays nice with **transactions** (fire multiple calls, gather results, then commit UI changes).

---

## Choosing Between Them

| Situation                                      | Pick                             | Rationale                                                                    |
| ---------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Render a list with spinners, errors, and retry | **Stateful**                     | UI binds to `NetworkState`; easy retries and shared state across components. |
| Submit a form and navigate away                | **Stateless**                    | No need to persist state; handle success/error inline.                       |
| Two panels need the same data instance         | **Stateful** with a shared `key` | Both panels observe the same `NetworkState`.                                 |
| Trigger multiple back-to-back mutations        | **Stateless**                    | Compose promises; avoid polluting global state.                              |
| Long-lived dashboard widgets                   | **Stateful**                     | Persistent data + easy refresh.                                              |

---

## Interop with `NetworkState` and Type Guards

Stateful hooks expose `NetworkState<T, E>`. For safe reads, use the **type guards** (see **Reading State Safely (Type Guards)**). Example:

```tsx
const [orders, fetchOrders] = useGetOrders({ fetchOnMount: true });

if (isPending(orders)) return <Spinner/>;
if (isError(orders))   return <ErrorView error={orders.error}/>;
if (isSuccess(orders)) return <OrdersTable rows={orders.data}/>;
return null;
```

Stateless hooks **don’t** expose `NetworkState`; you control the UI state yourself:

```tsx
const [getOrders] = useGetOrders();
const [rows, setRows] = useState<Order[]>([]);
const [err, setErr] = useState<unknown>(null);
const [isPending, startTransition] = useTransition();

useEffect(() => {
  startTransition(() => {
    (async () => {
      try {
        setRows(await getOrders());
      } catch (e) {
        setErr(e);
      }
    })();
  });
}, []);
```

---

## Lifecycle Binding Tips

* Prefer **stateful** when the data’s **lifetime matches the view**. Use `fetchOnMount` for first load and UI-driven `fetch` for refresh.
* Prefer **stateless** for button-driven actions and flows you’ll **navigate away** from after success.
* Pair `clearOnUnmount` with modals/drawers to leave no residues.

---

## Common Pitfalls & How to Avoid Them

* **Mixing keys inadvertently (stateful):** If you see “ghost” data, ensure the same `key` is used consistently. Different keys create isolated states.
* **Forgetting cleanup (stateful):** Use `clearOnUnmount` or call `clear` in `useEffect` cleanup when the state should not persist.
* **Overusing stateful for mutations:** For create/update/delete, stateless often yields simpler, safer code.
* **Reinventing NetworkState locally:** If your UI is state heavy (spinners, inline errors), use **stateful** instead of manual loading flags.

---

## FAQ

**Q: Can I mix both for the same endpoint?**
Yes. Use **stateful** for rendering, and call a **stateless** mutation to update data. After a successful mutation, call the stateful hook’s `fetch` to refresh.

**Q: How is deduplication handled?**
Within a stateful hook, Intrig tracks in-flight requests per `key`. If you call `fetch` again, implementations may **cancel** the previous request or queue—see your generator’s specifics.

**Q: Where do auth headers/base URLs come from?**
All hooks (both kinds) execute via the **`IntrigProvider`** configuration, which centralizes base URLs, headers (e.g., JWT), and cross-cutting concerns like interceptors.

---

## See Also

* **NetworkState (ADT)** – rationale and anatomy of the four states.
* **Reading State Safely (Type Guards)** – how to narrow `NetworkState` without runtime errors.
* **IntrigProvider** – how requests are executed and configured.
