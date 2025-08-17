# isSuccess

The **isSuccess** function is a TypeScript type guard that checks whether a `NetworkState` represents a successful API response. It provides type-safe access to response data by narrowing the type from a general `NetworkState<T, E>` to a specific `SuccessState<T, E>`.

## Overview

`isSuccess` is essential for safely handling network request states in your React components. It ensures that you can only access the `data` property when the request has actually succeeded, preventing runtime errors and providing excellent TypeScript intellisense.

## Function Signature

```typescript
function isSuccess<T, E = unknown>(
  state: NetworkState<T, E>
): state is SuccessState<T, E>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `T` | The type of the successful response data |
| `E` | The type of the error (defaults to `unknown`) |

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `NetworkState<T, E>` | The network state to check |

### Returns

| Type | Description |
|------|-------------|
| `state is SuccessState<T, E>` | Type predicate that narrows the state to `SuccessState<T, E>` when `true` |

## Basic Usage

### Simple Success Check

```jsx
import React from 'react';
import { useGetUsers, isSuccess } from '@intrig/react';

function UsersList() {
  const [usersResponse, fetchUsers] = useGetUsers({
    fetchOnMount: true
  });

  if (isSuccess(usersResponse)) {
    // TypeScript now knows usersResponse.data is available and properly typed
    return (
      <div>
        <h2>Users ({usersResponse.data.length})</h2>
        <ul>
          {usersResponse.data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <div>Loading users...</div>;
}
```

### Conditional Rendering with Multiple States

```jsx
import React from 'react';
import { useGetUserProfile, isSuccess, isPending, isError } from '@intrig/react';

function UserProfile({ userId }) {
  const [profileResponse] = useGetUserProfile({
    fetchOnMount: true,
    params: { userId }
  });

  if (isPending(profileResponse)) {
    return <div className="loading">Loading profile...</div>;
  }

  if (isError(profileResponse)) {
    return <div className="error">Failed to load profile</div>;
  }

  if (isSuccess(profileResponse)) {
    const { data: profile } = profileResponse;
    return (
      <div className="profile">
        <h1>{profile.name}</h1>
        <p>{profile.email}</p>
        <p>Member since: {profile.joinDate}</p>
      </div>
    );
  }

  return <div>Click to load profile</div>;
}
```

### Data Transformation

```jsx
import React, { useMemo } from 'react';
import { useGetOrders, isSuccess } from '@intrig/react';

function OrdersSummary() {
  const [ordersResponse] = useGetOrders({
    fetchOnMount: true
  });

  const orderStats = useMemo(() => {
    if (!isSuccess(ordersResponse)) {
      return null;
    }

    const orders = ordersResponse.data;
    return {
      total: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.amount, 0),
      averageAmount: orders.length > 0 
        ? orders.reduce((sum, order) => sum + order.amount, 0) / orders.length 
        : 0
    };
  }, [ordersResponse]);

  if (!orderStats) {
    return <div>Loading order summary...</div>;
  }

  return (
    <div className="orders-summary">
      <h2>Orders Summary</h2>
      <p>Total Orders: {orderStats.total}</p>
      <p>Total Amount: ${orderStats.totalAmount.toFixed(2)}</p>
      <p>Average Amount: ${orderStats.averageAmount.toFixed(2)}</p>
    </div>
  );
}
```

## Advanced Usage

### Type-Safe Data Extraction

```jsx
import React from 'react';
import { useGetProductDetails, isSuccess } from '@intrig/react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

function ProductCard({ productId }: { productId: number }) {
  const [productResponse] = useGetProductDetails({
    fetchOnMount: true,
    params: { productId }
  });

  // Extract data safely with full type information
  const product: Product | null = isSuccess(productResponse) 
    ? productResponse.data 
    : null;

  if (!product) {
    return <div>Loading product...</div>;
  }

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>Category: {product.category}</p>
      <p>Price: ${product.price}</p>
    </div>
  );
}
```

### Combining with useEffect

```jsx
import React, { useEffect, useState } from 'react';
import { useGetNotifications, isSuccess } from '@intrig/react';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsResponse, fetchNotifications] = useGetNotifications({
    fetchOnMount: false
  });

  useEffect(() => {
    // Fetch notifications when component mounts
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isSuccess(notificationsResponse)) {
      const unread = notificationsResponse.data.filter(n => !n.read).length;
      setUnreadCount(unread);
    }
  }, [notificationsResponse]);

  const hasUnread = unreadCount > 0;

  return (
    <button className={`notification-bell ${hasUnread ? 'has-unread' : ''}`}>
      🔔
      {hasUnread && (
        <span className="unread-count">{unreadCount}</span>
      )}
    </button>
  );
}
```

## Common Patterns

### Early Returns for Cleaner Code

```jsx
function DataDisplay() {
  const [dataResponse] = useGetData({ fetchOnMount: true });

  // Early return pattern for non-success states
  if (!isSuccess(dataResponse)) {
    return <LoadingOrErrorState response={dataResponse} />;
  }

  // Now we can safely work with dataResponse.data
  const { data } = dataResponse;
  
  return (
    <div>
      {/* Render your success UI */}
      <DataVisualization data={data} />
    </div>
  );
}
```

### Ternary Expressions

```jsx
function InlineDataDisplay() {
  const [dataResponse] = useGetData({ fetchOnMount: true });

  return (
    <div>
      {isSuccess(dataResponse) ? (
        <div>Data loaded: {dataResponse.data.name}</div>
      ) : (
        <div>No data available</div>
      )}
    </div>
  );
}
```

## Type Safety Benefits

The `isSuccess` function provides several TypeScript benefits:

1. **Type Narrowing**: After the check, TypeScript knows the exact shape of your data
2. **Intellisense**: Full autocomplete support for the data properties
3. **Compile-time Safety**: Prevents accessing `data` when it might not exist
4. **Error Prevention**: Eliminates common runtime errors related to undefined data

## Related Functions

- [`isPending`](./is-pending.md) - Check if a request is in progress
- [`isError`](./is-error.md) - Check if a request failed
- [`isInit`](./is-init.md) - Check if a request hasn't started yet
- [`NetworkState`](./network-state.md) - The base state interface

## Best Practices

1. **Always check state before accessing data**: Use `isSuccess` before accessing the `data` property
2. **Combine with other state checks**: Use alongside `isPending` and `isError` for comprehensive state handling
3. **Use early returns**: Check for success state early to avoid nested conditionals
4. **Leverage TypeScript**: Take advantage of the type narrowing for better development experience
5. **Handle all states**: Consider what to display for pending, error, and initial states

## Troubleshooting

### Common Issues

**Issue**: TypeScript complains about accessing `data` property
```typescript
// ❌ Bad - data might not exist
const name = response.data.name;

// ✅ Good - check success first
const name = isSuccess(response) ? response.data.name : 'Unknown';
```

**Issue**: Component doesn't re-render when data changes
```typescript
// ✅ Make sure to include the response in dependencies
useEffect(() => {
  if (isSuccess(response)) {
    // Handle success
  }
}, [response]); // Include response in dependencies
```