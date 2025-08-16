# How Intrig Works

Intrig is built to make frontend–backend integration **API-first** and **generation-driven**.
Instead of writing types and API calls by hand, Intrig uses your **OpenAPI/Swagger definition** to automatically create a ready-to-use, fully typed SDK — keeping your code in sync with the backend at all times.

---

## Core Workflow

1. **[Synchronization](./synchronization.md)**
   Pull the latest API definition from your backend and update your local Intrig configuration. This ensures your SDK always matches the current backend contract, catching breaking changes at compile time.

2. **[Code Generation](./code-generation.md)**
   Transform the API definition into typed hooks, async functions, and DTOs. Intrig publishes these directly into your project so you can import and use them immediately.

---

## Why This Matters

* **Fewer Integration Errors** – Changes in the backend flow directly into the generated code.
* **Type Safety by Default** – Mismatched parameters and missing fields are caught instantly.
* **No Boilerplate** – Ready-to-use hooks and types are generated for you.
* **Searchable SDK** – Find endpoints quickly by method, `operationId`, or path.

---

Once you understand these two steps — **synchronize** when the API changes, and **generate** to update your SDK — you’ll be working in a cleaner, faster, and more reliable integration workflow.
