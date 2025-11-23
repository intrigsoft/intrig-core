# Entry Point

IntrigProvider functions as the integration entry point for Intrig functionality in React applications. Placed at the application root, it provides global configuration and state management infrastructure to all generated hooks and utilities.

---

## Architecture Role

IntrigProvider establishes two primary integration layers:

**Network Communication**: Configures Axios instances for HTTP communication with backend services. Configuration maps directly to Axios `CreateAxiosDefaults` type, providing access to base URLs, headers, interceptors, and timeout settings.

**State Management**: Maintains global NetworkState storage indexed by source identifier, operation, and key. Generated hooks access this store through React Context, enabling state sharing across components without external state management libraries.

---

## Configuration Structure

IntrigProvider accepts a `configs` prop structured as a map of source identifiers to configuration objects:

```tsx
<IntrigProvider configs={{
  sourceId: {
    baseURL: string,
    timeout: number,
    headers: Record<string, string>,
    requestInterceptor: (config) => Promise<config>,
    responseInterceptor: (response) => Promise<response>
  }
}}>
  {children}
</IntrigProvider>
```

Source identifiers must match those defined in `intrig.config.json`. Each identifier namespaces its configuration and state storage.

---

## State Storage

Network state persists in memory for the provider's lifecycle. State is indexed by a composite key:

```
(sourceId, operationId, key)
```

Where:
- `sourceId`: API source identifier from configuration
- `operationId`: OpenAPI operation identifier
- `key`: Optional developer-provided discriminator (defaults to `'default'`)

This indexing enables:
- Multiple independent requests to the same endpoint (different keys)
- State sharing across components (same key)
- Request deduplication (same key, in-flight request)

---

## Integration with External Libraries

IntrigProvider operates independently of Redux, Zustand, MobX, or other state management solutions. Applications can integrate multiple state management approaches, though overlapping responsibilities complicate maintenance and debugging.

Intrig's state management is scoped to network requests. Application state, UI state, and business logic state remain separate concerns.

---

## Placement Requirements

Place IntrigProvider at the application root, above all components that use generated hooks:

```tsx
// Correct placement
<IntrigProvider configs={...}>
  <Router>
    <App />
  </Router>
</IntrigProvider>

// Incorrect - hooks above provider will fail
<Router>
  <IntrigProvider configs={...}>
    <App />
  </IntrigProvider>
</Router>
```

Hooks attempting to access Intrig context outside the provider will throw at runtime.

---

## Related Documentation

- [Hook Conventions](./hook-conventions.md) - Generated hook patterns and usage
- [State Management](./state-management.md) - NetworkState architecture and access patterns
- [IntrigProvider API](../api/intrig-provider.md) - Complete configuration reference
