# Stateful vs Stateless Hooks

Intrig generates two hook variants for each REST endpoint: stateful hooks that integrate with global NetworkState storage, and stateless hooks that return promises without persistent state. Selection between variants depends on state management requirements and component lifecycle patterns.

---

## Stateful Hooks

Stateful hooks bind endpoints to Intrig's global state store, maintaining NetworkState throughout the component lifecycle and enabling state observation across multiple components.

### Signature

```typescript
function useOperation<P, B, T>(
  options?: HookOptions<P, B>
): [
  NetworkState<T>,      // Current state
  (body?: B, params?: P) => void,  // Execute function
  () => void            // Clear function
]
```

### State Lifecycle

NetworkState transitions through four states:

```
init → pending → success | error
```

State persists in the global store indexed by `(sourceId, operationId, key)` until explicitly cleared or component unmounts with `clearOnUnmount` enabled.

### Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | `'default'` | State isolation key for managing independent instances |
| `clearOnUnmount` | `boolean` | `false` | Reset state to init on component unmount |
| `fetchOnMount` | `boolean` | `false` | Execute request on component mount |
| `params` | `P` | — | Parameters for fetchOnMount execution |
| `body` | `B` | — | Request body for fetchOnMount execution |

### Example Implementation

```tsx
const [productState, fetchProduct, clearProduct] = useGetProduct({
  key: `product:${productId}`,
  fetchOnMount: true,
  clearOnUnmount: true,
  params: { id: productId }
});

if (isPending(productState)) return <Loading />;
if (isError(productState)) return <Error error={productState.error} />;
if (isSuccess(productState)) return <ProductView product={productState.data} />;
return null;
```

### State Sharing

Multiple components using identical `key` values observe the same NetworkState:

```tsx
// Component A - initiates request
const [product] = useGetProduct({
  key: 'product:123',
  fetchOnMount: true,
  params: { id: '123' }
});

// Component B - observes same state
const [product] = useGetProduct({ key: 'product:123' });
```

No duplicate network requests occur. Both components receive state updates.

### Use Cases

Stateful hooks are appropriate for:

**Data Display**: Components rendering API responses with loading and error states

**State Sharing**: Multiple components requiring access to identical data

**Caching Behavior**: Data that should persist across re-renders within view lifetime

**Refresh Operations**: Scenarios requiring manual refetch or clear operations

---

## Stateless Hooks

Stateless hooks return promise-based functions without persistent state storage. State management responsibility transfers to the calling component.

### Signature

```typescript
function useOperationAsync<P, B, T>(
  options?: HookOptions<P, B>
): [
  (body?: B, params?: P) => Promise<T>,  // Async function
  () => void                              // Cancel function
]
```

### Execution Model

Function invocation returns a promise resolving to the response or rejecting with an error. No state persists in Intrig's store.

### Example Implementation

```tsx
const [createProduct] = useCreateProductAsync();

const handleSubmit = async (formData: ProductFormData) => {
  try {
    const product = await createProduct(formData);
    toast.success(`Created product ${product.id}`);
    navigate(`/products/${product.id}`);
  } catch (error) {
    toast.error('Product creation failed');
  }
};
```

### React 18 Integration

Stateless hooks integrate with React 18 concurrent features:

```tsx
const [createProduct] = useCreateProductAsync();
const [isPending, startTransition] = useTransition();

const handleSubmit = (formData: ProductFormData) => {
  startTransition(async () => {
    try {
      const product = await createProduct(formData);
      navigate(`/products/${product.id}`);
    } catch (error) {
      setError(error);
    }
  });
};
```

### Use Cases

Stateless hooks are appropriate for:

**Mutation Operations**: Create, update, delete operations without persistent state requirements

**Form Submissions**: One-time operations triggered by user actions

**Batch Operations**: Multiple sequential requests managed as a transaction

**Custom State Management**: Scenarios requiring application-specific state handling

---

## Selection Criteria

| Requirement | Stateful | Stateless |
|-------------|----------|-----------|
| Display loading/error states in UI | ✓ | Manual implementation required |
| Share state across components | ✓ | Not supported |
| Persist data during view lifetime | ✓ | Not applicable |
| Manual retry/refresh operations | ✓ | Re-invoke function |
| Form submission workflows | — | ✓ |
| Sequential mutation operations | — | ✓ |
| React 18 useTransition integration | — | ✓ |
| Minimal state management overhead | — | ✓ |

---

## NetworkState Integration

Stateful hooks expose `NetworkState<T>` requiring type guards for safe access:

```tsx
import { isPending, isError, isSuccess } from '@intrig/react';

const [ordersState, fetchOrders] = useGetOrders({ fetchOnMount: true });

if (isPending(ordersState)) return <Spinner />;
if (isError(ordersState)) return <ErrorView error={ordersState.error} />;
if (isSuccess(ordersState)) return <OrdersTable orders={ordersState.data} />;
return null;
```

Stateless hooks bypass NetworkState, returning promises directly:

```tsx
const [fetchOrders] = useGetOrdersAsync();
const [orders, setOrders] = useState<Order[]>([]);
const [error, setError] = useState<Error | null>(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetchOrders()
    .then(setOrders)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

---

## Lifecycle Patterns

### Stateful with fetchOnMount

Automatic data loading on component mount:

```tsx
const [userData] = useGetUser({
  fetchOnMount: true,
  clearOnUnmount: true,
  params: { id: userId }
});
```

State automatically loads and clears with component lifecycle.

### Stateless with useEffect

Manual lifecycle management:

```tsx
const [fetchUser] = useGetUserAsync();

useEffect(() => {
  const abortController = new AbortController();

  fetchUser({ id: userId }, { signal: abortController.signal })
    .then(handleSuccess)
    .catch(handleError);

  return () => abortController.abort();
}, [userId]);
```

---

## Common Issues

### Key Collision (Stateful)

**Symptom**: Unexpected data appears in components

**Cause**: Multiple components using identical keys unintentionally

**Resolution**: Use unique keys based on component-specific identifiers:

```tsx
// Correct - unique per product
const [product] = useGetProduct({ key: `product:${productId}` });

// Incorrect - shared across all instances
const [product] = useGetProduct({ key: 'product' });
```

### Missing Cleanup (Stateful)

**Symptom**: Stale data persists after component unmounts

**Cause**: State not cleared on unmount

**Resolution**: Enable `clearOnUnmount` or call `clear` in cleanup:

```tsx
const [productState, fetchProduct, clearProduct] = useGetProduct();

useEffect(() => {
  return () => clearProduct();
}, []);
```

### Overusing Stateful for Mutations

**Symptom**: Unnecessary state management complexity

**Cause**: Using stateful hooks for one-time operations

**Resolution**: Use stateless hooks for mutations:

```tsx
// Prefer stateless for mutations
const [deleteProduct] = useDeleteProductAsync();

await deleteProduct({ id: productId });
```

---

## Interoperability

Both hook types can coexist for the same endpoint:

```tsx
// Display with stateful
const [productsState, fetchProducts] = useGetProducts({
  fetchOnMount: true
});

// Mutate with stateless
const [createProduct] = useCreateProductAsync();
const [deleteProduct] = useDeleteProductAsync();

const handleCreate = async (data: ProductData) => {
  await createProduct(data);
  fetchProducts(); // Refresh list after creation
};
```

This pattern separates concerns: stateful for display, stateless for actions.

---

## Related Documentation

- [NetworkState Specification](../api/network-state.md) - State machine and type definitions
- [Hook Conventions](./hook-conventions.md) - Generated hook patterns
- [Lifecycle Binding](./lifecycle-binding.md) - Component lifecycle integration patterns
