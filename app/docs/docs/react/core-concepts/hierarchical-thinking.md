# Hierarchical Thinking

When using Intrig, where you place your data‑fetching hooks in the component tree matters. The idea of **hierarchical thinking** is to load data at the right level of your component hierarchy and let child components **passively observe** the state that already exists — without causing duplicate network requests.

> There aren’t separate hooks for *active* and *passive* usage. It’s the **same stateful hook** used in two different ways:
>
> * **Active** – you trigger `fetch`/`clear` (or use `fetchOnMount`).
> * **Passive** – you **do not** trigger anything; you only read the first tuple value (the `NetworkState`).

---

## Why It Matters

React applications often suffer from:

* **Duplicate requests** – Each component fetches the same data independently.
* **Prop drilling** – Data is fetched at the top and then passed down through many intermediate components.
* **Stale flashes** – A child triggers its own fetch even though the parent already has the data.

Intrig avoids these problems by encouraging you to think hierarchically:

1. **Load once, share many times.**
2. **Place active hooks high** in the tree (e.g., page or feature root).
3. **Let children passively observe** the global store by calling the same hook **without** triggering fetch.

> ⚠️ **Global Store, One Active Owner per Key**
> Remember: only lifecycle methods are bound to components, the data itself lives in the **global store**. Each `key` is a single shared channel. If you mount multiple active owners with the same key, you may see last-write-wins, unexpected `clearOnUnmount` resets, or duplicate requests.
> **Best practice:** choose one active owner per key; all others should remain passive. If you need parallel views, mint distinct keys (e.g., `product:${id}:panelA`, `product:${id}:panelB`).

---

## Example

Following example shows a simple use case where a parent component fetches data once and children observe passively.

<figure className="figure--center">
  <img
    src="/img/hierarchical-thinking-example.svg"
    alt="Hierarchical Thinking diagram showing parent as active owner and children as passive observers via global store"
    width="50%"
    className="figure__img--diagram"
  />
  <figcaption className="figure__caption">
    Figure: Parent fetches once and publishes to global store; children observe passively using the same hook with useMemo.
  </figcaption>
</figure>

### Page (Active Owner)

```tsx
function ProductPage({ id }: { id: string }) {
  // Active: bind at the page level
  const [productResp, fetchProduct] = useGetProduct({
    fetchOnMount: true,
    params: { id }
    // key: `product:${id}` // (optional) if you key the state, use the same key in children
  });

  if (isPending(productResp)) return <div>Loading…</div>;
  if (isError(productResp)) return <div>Failed to load product.</div>;

  return (
    <div>
      {/* Children do NOT receive product via props */}
      <ProductHeader />
      <ProductDetails />
      <ProductReviews />
    </div>
  );
}
```

### Children (Passive Observers)

```tsx
function ProductHeader() {
  // Passive: call the same hook but don't trigger fetch/clear
  const [resp] = useGetProduct(/* { key: `product:${id}` } if parent used a key */);

  // Extract a stable value from NetworkState
  const product = useMemo(() => (isSuccess(resp) ? resp.data : undefined), [resp]);

  return <h1>{product?.name}</h1>;
}

function ProductDetails() {
  const [resp] = useGetProduct();
  const product = useMemo(() => (isSuccess(resp) ? resp.data : undefined), [resp]);
  return <p>{product?.description}</p>;
}
```

**Why `useMemo`?** It lets each child derive a stable `product` reference from the `NetworkState` without recomputing on every render and without relying on an experimental selector helper.

> ⚠️ **Note on keys:** If the parent used a `key` (e.g., for multiple concurrent product views), **children must pass the same `key`** when calling the hook to read the correct slice of state.

---

## Directory Structure & Cohesion

This pattern is easier to apply if your file structure mirrors your component hierarchy:

```
/pages/product/[id]/
  index.tsx        # ProductPage – owns the data (active)
  ProductHeader.tsx  # passive observer
  ProductDetails.tsx # passive observer
  ProductReviews.tsx # passive observer
```

Compared to a flat structure (`pages/`, `components/`, `utils/`), hierarchical organization makes it obvious where the “root” for active hooks should be placed.

---

## Guidelines

* Bind **active** hooks at the highest logical component (usually a page or feature root).
* In children, **call the same stateful hook passively** (don’t trigger `fetch`/`clear`).
* Use **`useMemo`** in each child to extract the needed value from the `NetworkState`.
* If you use **keys**, keep them consistent between the owner and all observers.
* Avoid scattering fetch logic across unrelated components — centralize it at the owner level.

---

**In short:** *Hierarchical thinking keeps your app efficient and clean by ensuring data is fetched once at the owner, while children passively observe and render the shared state.*
