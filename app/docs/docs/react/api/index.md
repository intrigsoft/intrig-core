# API Reference (Overview)

The Intrig React SDK provides a small but powerful set of building blocks for integrating your frontend with backend APIs. These APIs fall into two main groups:

1. **Providers and State Utilities** – Core pieces that establish configuration and model the lifecycle of network calls.
2. **Generated Hooks** – Ready-to-use functions that encapsulate API requests with consistent signatures and predictable state management.

At a high level, you’ll work with:

* **`IntrigProvider`** – The entry point of every Intrig-enabled React app. It sets up global configuration (base URLs, headers, authentication) and provides shared storage for network state across all components.

* **`NetworkState`** – An algebraic type representing the lifecycle of an async request. A call may be in one of four mutually exclusive states: `init`, `pending`, `success`, or `error`. This makes rendering safe and predictable, with type guards available for each case.

* **Generated Hooks** – Functions tailored to your API definition:

    * **Stateful hooks** cache results in the global store, making them ideal for reusable or observable data. See: [Stateful Hook Template](/docs/react/api/stateful-hook)
    * **Stateless hooks** run one-off calls without storing results, perfect for actions like form submissions. See: [Stateless Hook Template](/docs/react/api/stateless-hook)
    * **Specialized hooks** extend the model for streaming (`SSE Hook`) and file transfers (`Download Hook`). See: [Download Hook Template](/docs/react/api/download-hook)

Together, these components let you call APIs with minimal boilerplate while keeping type safety and integration consistency at the center of your workflow.
