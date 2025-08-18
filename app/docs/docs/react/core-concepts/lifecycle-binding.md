# Lifecycle Binding (Active vs Passive)

When working with Intrig, **lifecycle binding** is not about using two different hooks — it’s about how you use a **stateful hook**. The same generated hook can behave as either **active** or **passive**, depending on whether you call its fetch/clear functions or configure its options.

---

## Active Lifecycle Binding

A hook becomes **active** when you explicitly tie it to the React component’s lifecycle:

* **On mount** → it triggers a network call if you call the `fetch` function or enable `fetchOnMount`.
* **On unmount** → it clears or resets the network state if you call `clear` or enable `clearOnUnmount`.

This makes the component the *owner* of the data it loads. The data exists as long as the component is on screen, and it is discarded when the component goes away.

**When to use:**

* Page-level or route-level components.
* Data that should not persist beyond the component’s lifetime.
* Preventing stale flashes when navigating between views.

```tsx
function ProductPage({ id }: { id: string }) {
  const [product, fetchProduct] = useGetProduct({
    fetchOnMount: true,
    clearOnUnmount: true,
    params: { id }
  });

  if (isPending(product)) return <Spinner />;
  if (isError(product)) return <ErrorView />;

  return <ProductDetails data={product.data} />;
}
```

Here, the `ProductPage` both loads and owns the product state. When you navigate away, Intrig resets the state to `init`.

---

## Passive Observation

A hook becomes **passive** when you simply observe its state without triggering fetch or clear yourself. In this mode, the hook reflects data that may have been loaded by another component.

This allows multiple components to **share the same data** without duplicating requests.

**When to use:**

* Child components that only display already-loaded data.
* Widgets or fragments that should reflect the current network state.
* Avoiding duplicate calls to the same endpoint.

```tsx
function ProductSidebar() {
  const [product] = useGetProduct();

  // Simply renders if the data is already available
  if (isSuccess(product)) {
    return <SidebarDetails product={product.data} />;
  }
  return null;
}
```

Here, `ProductSidebar` never triggers a request itself. It only shows the data if `ProductPage` (or another component) has already loaded it.

---

## Choosing Between the Two

Think of it this way:

* **Active binding** = *“I call fetch/clear or enable options — I own this data’s lifecycle.”*
* **Passive observation** = *“I just need to see if this data is available — I don’t fetch or clear it myself.”*

A common pattern is to **load data in a page/root component (active)** and let **child components observe it (passive)**. This reduces redundant network calls and keeps ownership clear.

---

## Related Concepts

* [Stateful vs Stateless Hooks](/docs/react/core-concepts/stateful-vs-stateless) – deciding whether results should be cached in Intrig's global store.
* [Hierarchical Thinking](/docs/react/core-concepts/hierarchical-thinking) – placing active hooks high in the tree so children can observe.
* [Cookbook: Binding to Component Lifecycle](/docs/react/cookbook/binding-to-component-lifecycle) – practical examples and patterns.
