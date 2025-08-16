# Entry Point (Core Concept)

The **IntrigProvider** is the foundational entry point for integrating Intrig into a React application. It is the single, global configuration location that provides storage and network communication capabilities to all downstream components. By wrapping your application with `IntrigProvider` at the root level, you establish a consistent environment where every generated hook and utility can access shared configuration and infrastructure.

## Network Communication

IntrigProvider enables communication with your backend using **Axios** under the hood. Axios is chosen for its maturity, feature richness, and proven reliability in real-world applications. The configuration format for each source aligns with Axios’s `CreateAxiosDefaults` type, allowing you to apply familiar Axios settings such as base URLs, headers, interceptors, and timeouts.

## State Management

IntrigProvider also stores network state for each API source, making it available across all components without the need for external state management tools. Intrig does not depend on Redux, Zustand, MobX, or other libraries, which means it can run safely alongside them if required. However, using multiple state management systems in parallel should be approached with caution, as overlapping responsibilities can lead to complex and difficult-to-maintain code.

By centralizing configuration in `IntrigProvider`, you reduce boilerplate, avoid inconsistent settings, and create a predictable integration pattern that scales well as your application grows.

---

**Next Steps:**

* Learn about [Hook Conventions](/react/core-concepts/hook-conventions) to see how hooks consume the context provided by `IntrigProvider`.
* Explore [State Management](/react/core-concepts/state-management) for insight into how Intrig stores and shares network state across components.
