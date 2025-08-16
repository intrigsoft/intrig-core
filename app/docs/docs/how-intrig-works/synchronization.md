# Synchronization

Keep your generated SDK in lockstep with your backend by pulling, normalizing, and saving the latest OpenAPI/Swagger definition locally. Synchronization is explicit (you decide when) and fast.

---

## What “Sync” Does

* **Fetch** the latest **OpenAPI/Swagger** document for each configured source in `intrig.config.json`.
* **Normalize** the documentation (apply Intrig's canonicalization rules so downstream generation is consistent).
* **Save** the normalized documentation to `.intrig/specs/{sourceId}-latest.json`.

> ⚠️ **Warning:** Do not manually edit the saved spec file. Any local changes will be overwritten on the next sync.
> ✅ **Version Control:** All files in `.intrig/specs` should be committed to your version control system. They are part of your project’s API contract history.

> Intrig treats the API definition as the **single source of truth**. If the spec changes, your SDK and types will reflect it.

---

## When to Run It

* **When there’s a change in sources** – adding or removing API sources in `intrig.config.json`.
* **When backend APIs change** – endpoints, parameters, or schemas have been modified and need to be synchronized.

---

## Commands

```bash
Usage: intrig sync [options]

Sync all entities

Options:
  --all       Bypass source selection and sync all sources
  --id [id]   Bypass source selection and use the given id as the source to sync
  -h, --help  display help for command
```

**Important for CI:** The `intrig sync` command is interactive by default. In CI/CD environments, use the `--all` or `--id` flag to bypass source selection. Without one of these flags, the command will wait for input and may cause the CI job to fail.

Examples:

```bash
# Sync all sources without interaction
intrig sync --all

# Sync only the given source id without interaction
intrig sync --id productApi
```

---

## Typical Workflow

1. **Sync** – `intrig sync` (or `--all`/`--id`) to fetch, normalize, and save the latest spec(s).
2. **Generate** – `intrig generate` to update hooks, async functions, and types.
3. **Fix Types** – let your IDE/TS compiler guide required code edits (e.g., param rename).
4. **Run** – app compiles cleanly; integration stays in sync.

```bash
intrig sync --all && intrig generate
```

---

## Type-Safety Feedback Loop

* **Parameter renamed/added** → affected hooks/functions show TypeScript errors where used.
* **Schema field changed** → DTOs update; your code highlights mismatches immediately.
* **operationId changed** → hook/function names change; imports fail until updated.

> Path changes are usually transparent unless new/changed **path params** alter the call signature.

---

## See Also

* **Code Generation** – how hooks, async functions, and DTOs are produced and imported.
* **Thinking in Intrig** – patterns like stateful vs stateless hooks, lifecycle binding, and hierarchical placement.
* **Quickstart** – end‑to‑end setup and a first call example.
