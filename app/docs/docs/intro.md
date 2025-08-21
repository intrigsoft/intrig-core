---
# This file is the introduction to the Intrig documentation
# It is intentionally concise and linked from the root of the sidebar
---

# Welcome to Intrig

Intrig is an end‑to‑end API development toolkit that makes building and consuming APIs simple and efficient. It connects your backend (OpenAPI sources) to a type‑safe, framework‑friendly SDK and documentation experience.

## Get started

Ready to dive in? Start with the [Getting Started Guide](./getting-started.md) to set up Intrig and create your first SDK.

## What is Intrig?

Intrig bridges the gap between your backend APIs and frontend applications by:

- Generating type‑safe SDKs from your OpenAPI specifications
- Providing ergonomic React hooks for seamless API integration
- Offering real‑time documentation with Intrig Insight
- Supporting multiple frameworks like React, Next.js, and more

## Workflow at a glance

Follow this typical Intrig workflow:

1. Install Intrig in your project
2. Initialize your configuration
3. Add API sources from your OpenAPI specs
4. Restart the Intrig application to apply backend changes
5. Sync the API and generate the SDK
   - Run: `intrig sync --all && intrig generate`
6. Use the generated hooks and SDK in your application

Tip: When navigating the generated SDK, use the CLI helpers:
- `intrig search "query" --no-interactive` to find resources
- `intrig view <id> --no-interactive --type "schema|endpoint"` to inspect details

[Get started now →](./getting-started.md)