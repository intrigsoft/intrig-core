# Core Concepts

Intrig's **Core Concepts** for Next.js define the mental model for building full-stack applications using the SDK. Understanding these ideas will help you write cleaner, more maintainable, and more predictable code across both server and client environments.

---

## Server-Client Architecture

Next.js applications with Intrig follow a fundamental separation between server-side functions and client-side hooks. This dual-mode approach allows you to choose the optimal execution environment for each operation, leading to better performance and user experience.

Read more → [Server-Client Architecture](/docs/next/core-concepts/server-client-architecture)

---

## Configuration Management

Intrig uses different configuration approaches for server and client environments. Server-side functions rely on environment variables, while client-side hooks use the IntrigLayout component for configuration. Understanding this separation is crucial for proper setup.

Read more → [Configuration Management](/docs/next/core-concepts/configuration-management)

---

## Server-Side Functions

Server-side functions are async functions that run in Node.js environments (API routes and server components). They provide direct backend access without client-side state management overhead, making them ideal for data fetching, mutations, and server-side processing.

Read more → [Server-Side Functions](/docs/next/core-concepts/server-side-functions)

---

## Client-Side Hooks

Client-side hooks manage state and user interactions in the browser. They're optimized for Next.js hydration patterns and provide reactive state management, loading states, and error handling for dynamic user interfaces.

Read more → [Client-Side Hooks](/docs/next/core-concepts/client-side-hooks)

---

## Middleware Integration

Next.js middleware enhanced with Intrig enables centralized request processing at the edge. This includes authentication header injection, rate limiting, request transformation, and other preprocessing capabilities before requests reach your API routes or server components.

Read more → [Middleware Integration](/docs/next/core-concepts/middleware-integration)

---

**Next Steps:**

* Start with [Server-Client Architecture](/docs/next/core-concepts/server-client-architecture) to understand the fundamental separation of concerns.
* Learn about [Configuration Management](/docs/next/core-concepts/configuration-management) to properly set up your application.
* Explore server and client concepts to understand when to use each approach.