# API Reference (Overview)

The Intrig Next.js SDK provides a comprehensive set of building blocks for integrating your full-stack application with backend APIs. These APIs fall into three main groups:

1. **Server-Side Functions** – Direct backend access for API routes and server components without client-side overhead.
2. **Client-Side Hooks** – React hooks optimized for Next.js hydration and SSR scenarios.
3. **Providers and Utilities** – Core pieces that establish configuration and manage state across server and client boundaries.

At a high level, you'll work with:

* **Server-Side Functions** – Async functions that run in API routes and server components:
    * **Action functions** perform direct backend calls with automatic error handling and type safety. See: [Server Functions](/docs/next/api/server-functions)
    * **Execute functions** provide lower-level access with raw response data and headers. See: [Execute Functions](/docs/next/api/execute-functions)

* **Client-Side Hooks** – React hooks for client-side state management:
    * **Stateful hooks** cache results and handle hydration seamlessly. See: [Client Hooks](/docs/next/api/client-hooks)
    * **Stateless hooks** perform one-off operations without caching. See: [Stateless Hooks](/docs/next/api/stateless-hooks)
    * **Streaming hooks** handle Server-Sent Events with automatic reconnection. See: [SSE Hooks](/docs/next/api/sse-hooks)

* **Providers and State** – Configuration and state management:
    * **IntrigProvider** sets up global configuration for both server and client contexts. See: [IntrigProvider](/docs/next/api/intrig-provider)
    * **NetworkState** manages the lifecycle of async requests with hydration support. See: [Network State](/docs/next/api/network-state)
    * **Middleware utilities** enhance Next.js middleware with Intrig capabilities. See: [Middleware Utils](/docs/next/api/middleware-utils)

Together, these components let you build full-stack Next.js applications with minimal boilerplate while maintaining type safety and consistency between server and client environments.