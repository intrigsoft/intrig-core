# API Reference (Overview)

The Intrig Next.js SDK provides a comprehensive set of building blocks for integrating your full-stack application with backend APIs. These APIs fall into three main groups:

1. **Server-Side Functions** – Direct backend access for API routes and server components without client-side overhead.
2. **Client-Side Hooks** – React hooks optimized for Next.js hydration and SSR scenarios.
3. **Providers and Utilities** – Core pieces that establish configuration and manage state across server and client boundaries.

At a high level, you'll work with:

* **Server-Side Functions** – Async functions that run in API routes and server components:
    * Learn how to use both high-level action functions and lower-level execute functions in one place: [Server Functions](/docs/next/api/server-functions)

* **Client-Side Hooks** – React hooks for client-side state management:
    * **Stateful Hook** caches results and handles hydration seamlessly. See: [Stateful Hook](/docs/next/api/stateful-hook)
    * **Stateless Hook** performs one-off operations without caching. See: [Stateless Hook](/docs/next/api/stateless-hook)
    * **Download Hook** simplifies file downloads with progress tracking. See: [Download Hook](/docs/next/api/download-hook)

* **Providers and State** – Configuration and state management:
    * **IntrigLayout** sets up global configuration and automatic hydration for Next.js apps. See: [IntrigLayout](/docs/next/api/intrig-layout)
    * **NetworkState** manages the lifecycle of async requests with hydration support. See: [Network State](/docs/next/api/network-state)
    * **Middleware** enhances Next.js middleware with Intrig capabilities. See: [Middleware](/docs/next/api/middleware)
    * **Status Helpers** quick helpers to check request state: [isSuccess](/docs/next/api/is-success), [isError](/docs/next/api/is-error), [isPending](/docs/next/api/is-pending), [isInit](/docs/next/api/is-init)

Together, these components let you build full-stack Next.js applications with minimal boilerplate while maintaining type safety and consistency between server and client environments.