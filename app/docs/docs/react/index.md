# React Integration

Intrig's React integration provides type-safe hooks and state management for OpenAPI-based API integration. This section documents the framework-specific implementation, generated hook patterns, and integration architecture.

---

## Documentation Structure

### Core Concepts

Framework-specific architectural patterns and mental models for React integration.

**Topics covered:**
- IntrigProvider as the application entry point
- Generated hook conventions and naming
- Global state management architecture
- Stateful vs stateless hook patterns
- Component lifecycle integration
- Hierarchical component organization

[View Core Concepts →](./core-concepts)

---

### API Reference

Complete technical specification for React-specific components, hooks, and utilities.

**Components and utilities:**
- IntrigProvider configuration and setup
- Stateful hook patterns and options
- Stateless hook patterns
- NetworkState type definitions
- Type guard functions (isSuccess, isError, isPending, isInit)
- Download hook for file operations

[View API Reference →](./api)

---

### Tutorial

Step-by-step implementation guide for common integration scenarios.

**Tutorial topics:**
- Basic application setup with authentication
- Error handling patterns
- File upload and download operations
- Server-sent events integration

[View Tutorial →](./tutorial/basic-application)

---

### Cookbook

Practical patterns and implementation strategies for common scenarios.

**Patterns covered:**
- Lifecycle binding techniques
- Shorthand syntax usage
- State caching strategies
- Duplicate state management

[View Cookbook →](./cookbook/binding-to-component-lifecycle)

---

### Known Pitfalls

Common issues and their prevention strategies.

**Pitfalls documented:**
- State leak prevention
- Memory leak avoidance
- Unnecessary re-render prevention
- Performance optimization patterns

[View Known Pitfalls →](./known-pitfalls/state-leak)

---

## Integration Overview

React integration consists of three primary components:

**IntrigProvider**: Context provider managing global state and Axios instance configuration for all API sources.

**Generated Hooks**: Type-safe hooks generated from OpenAPI operations, available in stateful and stateless variants.

**NetworkState System**: Algebraic data type representing request lifecycle states (init, pending, success, error) with type-safe access patterns.

---

## Quick Reference

### Setup

```tsx
import { IntrigProvider } from '@intrig/react';

function Root() {
  return (
    <IntrigProvider configs={{
      userApi: {
        baseURL: 'https://api.example.com',
        timeout: 5000
      }
    }}>
      <App />
    </IntrigProvider>
  );
}
```

### Stateful Hook Usage

```tsx
import { useGetUser } from '@intrig/react/userApi/users/getUser/useGetUser';
import { isSuccess, isError, isPending } from '@intrig/react';

function UserProfile({ userId }: { userId: string }) {
  const [userState, getUser] = useGetUser({
    fetchOnMount: true,
    params: { id: userId }
  });

  if (isPending(userState)) return <Loading />;
  if (isError(userState)) return <Error error={userState.error} />;
  if (isSuccess(userState)) return <Profile user={userState.data} />;
  return null;
}
```

### Stateless Hook Usage

```tsx
import { useCreateUserAsync } from '@intrig/react/userApi/users/createUser/useCreateUserAsync';

function CreateUserForm() {
  const [createUser] = useCreateUserAsync();

  const handleSubmit = async (formData: UserFormData) => {
    try {
      const user = await createUser(formData);
      navigate(`/users/${user.id}`);
    } catch (error) {
      showError(error);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Next Steps

**New to Intrig**: Start with [Core Concepts](./core-concepts) to understand the architecture and mental model.

**Implementing Integration**: Reference [API Documentation](./api/intrig-provider) for detailed configuration options.

**Building Features**: Follow the [Tutorial](./tutorial/basic-application) for practical implementation examples.
