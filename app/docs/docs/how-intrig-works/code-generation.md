# Code Generation

Transform your (synced & normalized) OpenAPI/Swagger specs into a ready‑to‑use SDK composed of **framework‑agnostic data types** and **framework‑specific integration logic**.

---

## What “Generate” Does

* Reads normalized specs from `.intrig/specs/{sourceId}-latest.json`.
* Produces two categories of artifacts per source:

    * **Data Types** – framework‑agnostic.
    * **Integration Logic** – framework‑specific.
* Publishes the SDK into your project’s `node_modules` for immediate import.

> Always run **Synchronization** first so specs are current.

---

## Command

```bash
intrig generate
```

Generates for all configured sources. If no normalized file exists, run `intrig sync` first.

---

## Outputs

1. **Data Types (framework‑agnostic)**

    * **TypeScript types/interfaces** – DTOs, enums, schemas.
    * **Zod schemas** – runtime validation aligned with types.
    * **JSON Schema** – machine‑readable format for tooling.

2. **Integration Logic (framework‑specific)**

    * Generated per selected framework.
    * Example: React hooks with `[state, call]` signature.
    * Directory structure and import paths are framework‑specific; see the corresponding framework documentation for details.

---

## When to Run It

* At a fresh clone of the repository.
* After a sync operation.
* After switching branches.
* After running `npm install` (since it can wipe out the generated SDK).
* When backend APIs change (endpoints, params, schemas).
* In CI, so the SDK is available for the application to compile.

---

## Regeneration & Overwrites

* Overwrites published SDK in `node_modules`.
* Do not edit generated files; changes will be lost.

---

## Gochas (Common Pitfalls)

* **Imports break** → `operationId` changed. Search by Tag or path to update.
* **Type errors** → Schema changed. Update call sites.
* **Spec missing** → Run `intrig sync` first.

---

## See Also

* **Synchronization** – fetching & normalizing specs.
* **Framework Guides** – integration logic per framework.
