# Core Concepts

Intrig's **Core Concepts** for Next.js define the mental model for building full-stack applications using the SDK. Understanding these ideas will help you write cleaner, more maintainable, and more predictable code across both server and client environments.

---

## Server-Client Architecture

Next.js applications with Intrig follow a clear separation between server-side functions and client-side hooks. Server functions handle data fetching in API routes and server components, while client hooks manage state and user interactions. Understanding this separation is crucial for building efficient Next.js applications.

Read more → [Server-Client Architecture](/docs/next/core-concepts/server-client-architecture)

---

## App Router vs Pages Router

Intrig supports both Next.js routing patterns with specific optimizations for each. The App Router provides server component integration and streaming capabilities, while the Pages Router offers traditional API routes and client-side rendering patterns.

Read more → [App Router vs Pages Router](/docs/next/core-concepts/app-router-vs-pages-router)

---

## Server-Side Functions

Server-side functions are async functions that run in API routes and server components. They provide direct backend access without the overhead of client-side state management, making them ideal for data fetching, mutations, and server-side processing.

Read more → [Server-Side Functions](/docs/next/core-concepts/server-side-functions)

---

## Client-Side Hooks

Client-side hooks in Next.js work similarly to React hooks but are optimized for hydration and server-side rendering scenarios. They handle client-side state, user interactions, and dynamic data updates after the initial page load.

Read more → [Client-Side Hooks](/docs/next/core-concepts/client-side-hooks)

---

## Hydration and SSR Patterns

Managing state consistency between server and client is crucial in Next.js applications. Intrig provides patterns for handling hydration, preventing layout shifts, and ensuring smooth transitions from server-rendered to client-interactive states.

Read more → [Hydration and SSR Patterns](/docs/next/core-concepts/hydration-ssr-patterns)

---

## Middleware Integration

Next.js middleware can be enhanced with Intrig for authentication, request/response transformation, and edge-side processing. Understanding how to integrate Intrig with middleware enables powerful pre-processing capabilities.

Read more → [Middleware Integration](/docs/next/core-concepts/middleware-integration)

---

**Next Steps:**

* Explore each concept in detail through the linked pages.
* Apply these patterns in your Next.js components to make the most of Intrig's server and client capabilities.
* Start with server-client architecture to understand the fundamental separation of concerns.