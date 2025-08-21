# Download Hook

Download hooks are specialized **stateful hooks** designed for file transfers. They share the same structure as stateful hooks (`[state, execute, clear]`), but add file-handling behavior.

There are two variants:

* **Auto-download** → Immediately saves the file to disk by creating a temporary link and clicking it, then resets state.
* **Manual/stateful** → Exposes the downloaded data and headers so you can preview, transform, or save manually.

Use a download hook when your endpoint serves files. If you don’t need auto-save behavior, the manual/stateful variant works just like a regular stateful hook.

---

## Overview

All download hooks return a **tuple**:

```ts
const [state, execute, clear] = useSomeDownload(/* options */);
```

1. **`state`** → `NetworkState<Response>` — current state. When `success`, includes `state.data` and `state.headers`.
2. **`execute`** → Starts the download request. Signature: `(params: P) => DispatchState<any>`.
3. **`clear`** → Cancels any in-flight request and resets state to `init` (when clear helpers are used).

Each hook also has a static `key: string` for store identity (e.g., `"productApi: GET /export"`).

---

## Type Signatures

Source of truth: generated code in `@intrig/react` → `provider-hooks.ts`, `network-state.tsx`.

* **Base structure (stateful):**

  ```ts
  type UnaryFunctionHook<P, T> =
    (options?: UnaryHookOptions<P>) => [
      NetworkState<T>,
      (params: P) => DispatchState<any>,
      () => void
    ] & { key: string }
  ```

* **Generated names:**

    * Manual/stateful variant → `use<Operation>()`
    * Auto-download variant → `use<Operation>Download()`

`Response` is the generated response type (often a `Blob` or JSON fallback). `P` is the generated params type (path/query).

---

## Auto-download Variant

* Forces `responseType: 'blob'` and `adapter: 'fetch'`.
* Derives filename from `Content-Disposition` header if present; otherwise uses a fallback.
* Creates an object URL from the blob (or stringifies JSON for user-friendly error files).
* Appends a temporary `<a>` link, triggers click, removes it.
* Resets state back to `init` after successful save.

---

## Manual/Stateful Variant

* Performs the same request but does **not** auto-save.
* You decide what to do with `state.data` and `state.headers`.
* Common use cases:

    * Generate an object URL for preview.
    * Save the file with a custom filename.
    * Post-process binary data.

⚠️ Remember to clean up URLs with `URL.revokeObjectURL`.

---

## Constraints & Server Requirements

* **CORS headers** — To access `Content-Disposition` and `Content-Type`:

  ```http
  Access-Control-Expose-Headers: Content-Disposition, Content-Type
  ```
* **Content type** — If `application/json`, auto-download stringifies JSON so the saved file is readable.
* **Browser quirks** — iOS Safari may open blob URLs in a new tab instead of saving directly.

---

## Examples

### Auto-download button

```tsx
const [downloadResp, download] = useExportReportDownload({ clearOnUnmount: true });

return (
  <button onClick={() => download({ id: "42" })} disabled={isPending(downloadResp)}>
    {isPending(downloadResp) ? "Downloading…" : "Download"}
  </button>
);
```

### Manual preview/save

```tsx
const [fileResp, fetchFile] = useExportReport({ clearOnUnmount: true });

useEffect(() => {
  if (isSuccess(fileResp)) {
    const ct = fileResp.headers?.["content-type"] ?? "application/octet-stream";
    const parts = Array.isArray(fileResp.data) ? fileResp.data : [fileResp.data];
    const url = URL.createObjectURL(new Blob(parts, { type: ct }));
    // Use `url` to preview in UI
    return () => URL.revokeObjectURL(url);
  }
}, [fileResp]);
```

---

## When to Use

* **Auto-download** → For endpoints where the expected behavior is to save a file directly (e.g., export reports, download CSV/PDF).
* **Manual/stateful** → When you need finer control: previewing, transforming, or saving with a custom flow.

If you don’t need download-specific behavior, a regular **stateful hook** is sufficient.
