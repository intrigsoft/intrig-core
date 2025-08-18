## Thinking in Intrig

Working with Intrig isn’t just about using a new tool — it’s about adopting a different mindset.
Traditional frontend–backend integration often grows ad-hoc and leads to gaps, rework, and miscommunication. Intrig changes that by making your development **API-first** and **generation-driven**.

---

### 1. From Ad-Hoc to API-First

In a regular setup without code generation, developers write data types and functions manually to call backend endpoints. This often happens in parallel with backend development — sometimes under the assumption it saves time.
In reality, these parallel tracks can drift apart. Data types might not match, endpoints may differ, and integration becomes a guessing game, followed by costly rework.

**Intrig flips this workflow:**

* **Get requirements clarified first.**
* If backend isn’t ready, create **mock endpoints** directly in the backend application — for example, temporary mock implementations inside your controllers. If your Swagger setup is correct, these mocks will automatically be reflected in the generated API documentation.
* Once the mock API is ready, **generate the Intrig code**.
* Frontend developers can wire up their components using generated code while backend developers work on real implementations.

It’s slightly more sequential, but it removes the integration guesswork and prevents expensive back-and-forth later.

---

### 2. Changes Flow Through Swagger

In Intrig, changes happen when the **API definition changes** — not through verbal agreements or Slack messages.
Once Swagger reflects the change:

1. Regenerate your Intrig code.
2. The updated hooks, types, and async functions are ready to use.

This keeps everyone working from the same truth. The generated code is reliable **unless the Swagger documentation is wrong**.
It does mean backend teams must keep their Swagger output accurate and up to date — and it’s always a best practice to document your APIs thoroughly — but the payoff is fewer broken integrations.

---

### 2.5 Instant Synchronization & Type Safety

In traditional development, keeping frontend code in sync with backend changes is a manual, error-prone process. Developers often find out about a breaking change **only after** runtime errors occur — sometimes long after the change was made.

With Intrig, synchronization is **instantaneous**:

1. Run `sync` to pull the latest API definition.
2. Run `generate` to update all hooks, types, and async functions.

The moment you regenerate, your typechecker works as a safety net:

* Parameter changes, type mismatches, and missing fields are caught immediately.
* Most integration issues are spotted before you even run the app.

**Trade-off:**

* Hook names are tied to the **operationId** in the Swagger spec — if this changes, your code will break and need updating.
* Path changes are usually transparent unless they involve **path variables**, in which case parameters may change and type errors will appear.

This means fewer silent integration errors and faster feedback when backend changes occur.

---

### 3. Search and Integrate Quickly

With Intrig, frontend developers don’t have to dig through backend code or long API docs to find what they need.
If you know:

* The **method name**, or
* The **operationId**, or
* The **endpoint path**

…you can search for it in your generated SDK and copy-paste the ready-to-use hook or async method directly into your component.
No boilerplate, no manual type definitions — just instant integration.

---

### 4. Patterns and Constraints That Matter

Intrig encourages certain patterns that help you get the most out of the SDK. Knowing them early will make your code cleaner and easier to maintain:

* **[Storage Behavior](patterns/storage-behavior)** – Intrig maintains a global store of each API endpoint’s state outside of any component, allowing multiple components to access the same network state without knowing about each other.
* **[Keys for Distinct Responses](patterns/keyed-calls)** – Reuse the same endpoint for multiple states at once (e.g., product comparison) by adding a key to the hook, ensuring each state remains separate.
* **[Stateful vs. Stateless Hooks](patterns/stateful-vs-stateless)** – Use stateful hooks when you want results cached in Intrig’s store (like search results or product details). Use stateless hooks for temporary or one-off operations such as form submissions.
* **[Active Lifecycle Binding vs. Passive Observation](patterns/lifecycle-vs-passive)** – Lifecycle binding triggers load/unload with the component to prevent stale flashes; passive observation displays data loaded by another component without triggering its own fetch.
* **[Hierarchical Component Thinking](patterns/hierarchical-thinking)** – Place data-fetching hooks higher in the component tree and let child components observe. For example, load product data in a page-level component and let children reuse it without re-fetching. This works especially well if your file structure mirrors the component hierarchy (e.g., Next.js style), making it easier to identify the true “root” for active hook binding compared to a flat pages/components/utils separation.

**Layout guidance:** While not mandatory, a route- or feature-based directory structure (such as Next.js) tends to make Intrig’s hierarchical hook binding pattern easier to apply. By colocating the page-level “owner” component with its related child components, you can clearly identify where active hooks should be bound, reducing accidental duplicate fetches and improving cohesion.

---

**In short:** Thinking in Intrig is about designing APIs first, letting the code generation handle the repetitive work, and adopting patterns that keep frontend and backend in sync. Once you internalize this workflow, you’ll find development faster, cleaner, and less error-prone.

---
