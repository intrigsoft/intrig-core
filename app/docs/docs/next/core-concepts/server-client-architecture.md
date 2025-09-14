# Server-Client Architecture

Understanding the separation between server-side functions and client-side hooks is fundamental to building effective Next.js applications with Intrig.

## Overview

*This page is under development. More detailed content will be added in future updates.*

## Server-Side Functions

Server functions run in Node.js environments and provide direct access to backend APIs without client-side overhead.

## Client-Side Hooks

Client hooks manage state and user interactions in the browser environment, optimized for Next.js hydration patterns.

## Best Practices

- Use server functions for initial data loading and mutations
- Use client hooks for dynamic user interactions and real-time updates
- Maintain clear separation between server and client concerns