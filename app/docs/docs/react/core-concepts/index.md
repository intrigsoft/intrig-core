# Core Concepts

Intrig’s **Core Concepts** for React define the mental model for building applications using the SDK. Understanding these ideas will help you write cleaner, more maintainable, and more predictable code.

---

## Entry Point

Every React application using Intrig starts with the `IntrigProvider`. It establishes the configuration for one or more API sources, sets up global defaults like base URLs and authentication headers, and makes these settings available to all generated hooks and utilities via React Context. Placing `IntrigProvider` at the root of your application ensures consistent behavior and state sharing across the entire component tree.
Read more → [Entry Point](/docs/react/core-concepts/entry-point)

---

## Hook Conventions

All generated hooks follow a consistent pattern to ensure readability and ease of use for developers familiar with Intrig. This includes standard naming based on API operation IDs, predictable signatures, and a consistent way to manage parameters, responses, and network states.

Read more → [Hook Conventions](/docs/react/core-concepts/hook-conventions)

---

## State Management

Intrig maintains a global store of network state for each API endpoint. This allows multiple components to access the same state without needing to pass props or manually synchronize data.

Read more → [State Management](/docs/react/core-concepts/state-management)

---

## Stateful vs Stateless Hooks

Stateful hooks cache results in the global store and are ideal for data you want to reuse or observe from multiple components. Stateless hooks are best for one-off operations where caching isn’t needed.

Read more → [Stateful vs Stateless Hooks](/docs/react/core-concepts/stateful-vs-stateless)

---

## Lifecycle Binding (Active vs Passive)

Active hooks load data when a component mounts and clean up when it unmounts. Passive observation allows components to display data loaded elsewhere without triggering additional requests.

Read more → [Lifecycle Binding](/docs/react/core-concepts/lifecycle-binding)

---

## Hierarchical Thinking

Place data-fetching hooks higher in the component tree to minimize duplicate requests and make state sharing easier. Organizing your file structure to mirror your component hierarchy can make this pattern easier to apply.

Read more → [Hierarchical Thinking](/docs/react/core-concepts/hierarchical-thinking)

---

**Next Steps:**

* Explore each concept in detail through the linked pages.
* Apply these patterns in your own components to make the most of Intrig’s generated hooks and network state management.
