import { camelCase, mdLiteral, pascalCase, ResourceDescriptor, RestData } from "@intrig/plugin-sdk";

export function reactDownloadHookDocs(descriptor: ResourceDescriptor<RestData>) {
  const md = mdLiteral('download-hook.md');

  // ===== Derived names (preserve these) =====
  const hasPathParams = (descriptor.data.variables ?? []).some(
    (v: any) => v.in?.toUpperCase() === 'PATH',
  );

  const actionName = camelCase(descriptor.name);                  // e.g. downloadTaskFile
  const respVar = `${actionName}Resp`;                            // e.g. downloadTaskFileResp

  const paramsVar = hasPathParams ? `${actionName}Params` : undefined; // e.g. downloadTaskFileParams
  const paramsType = hasPathParams ? `${pascalCase(descriptor.name)}Params` : undefined; // e.g. DownloadTaskFileParams

  const pascal = pascalCase(descriptor.name);
  const responseTypeName = `${pascal}ResponseBody`; // e.g. DownloadTaskFileResponseBody

  return md`
# Intrig Download Hooks — Quick Guide

## Copy-paste starter (fast lane)

### Auto-download (most common)
${"```ts"}
import { use${pascal}Download } from '@intrig/react/${descriptor.path}/client';
${"```"}
${"```ts"}
import { isPending, isError } from '@intrig/react';
${"```"}
${"```tsx"}
const [${respVar}, ${actionName}] = use${pascal}Download({ clearOnUnmount: true });
// e.g., in a click handler:
${actionName}(${paramsType ? paramsVar ?? '{}' : '{}'});
${"```"}

### Manual/stateful (you handle the blob/UI)
${"```ts"}
import { use${pascal} } from '@intrig/react/${descriptor.path}/client';
${"```"}
${"```ts"}
import { isSuccess, isPending, isError } from '@intrig/react';
${"```"}
${"```tsx"}
const [${respVar}, ${actionName}] = use${pascal}({ clearOnUnmount: true });
// later:
${actionName}(${paramsType ? paramsVar ?? '{}' : '{}'});
${"```"}

---

## TL;DR (auto-download)
${"```tsx"}
import { use${pascal}Download } from '@intrig/react/${descriptor.path}/client';
import { isPending, isError } from '@intrig/react';

export default function Example() {
  const [${respVar}, ${actionName}] = use${pascal}Download({ clearOnUnmount: true });

  return (
    <button
      onClick={() => ${actionName}(${paramsType ? paramsVar ?? '{}' : '{}'})}
      disabled={isPending(${respVar})}
    >
      {isPending(${respVar}) ? 'Downloading…' : 'Download'}
    </button>
  );
}
${"```"}

### Type Imports

These types are generated and available for import:

${"```ts"}
${paramsType ? `// Path/query parameters type
import type { ${paramsType} } from '@intrig/next/${descriptor.path}/${pascal}.params';
` : ''}// Response type (Blob for downloads)
import type { ${responseTypeName} } from '@intrig/next/${descriptor.path}/${pascal}.response';
${"```"}

> **Tip:** Always import types from the SDK rather than defining them inline. This ensures type safety and keeps your code in sync with the API.

---

## Hook APIs

### \`use${pascal}Download\` (auto-download)
- **What it does:** requests the file with \`responseType: 'blob'\` + \`adapter: 'fetch'\`, derives filename from \`Content-Disposition\` if present, creates a temporary object URL, clicks a hidden \`<a>\`, **downloads**, then resets state to \`init\`.
- **Signature:** \`[state, download, clear]\`
  - \`download(params: ${paramsType ?? 'Record<string, unknown>'}) => void\`

### \`use${pascal}\` (manual/stateful)
- **What it does:** same request but **does not** auto-save. You control preview/saving using \`state.data\` + \`state.headers\`.
- **Signature:** \`[state, fetchFile, clear]\`
  - \`fetchFile(params: ${paramsType ?? 'Record<string, unknown>'}) => void\`

---

## Usage Patterns

### 1) Auto-download on click (recommended)
${"```tsx"}
const [${respVar}, ${actionName}] = use${pascal}Download({ clearOnUnmount: true });

<button
  onClick={() => ${actionName}(${paramsType ? paramsVar ?? '{}' : '{}'})}
  disabled={isPending(${respVar})}
>
  {isPending(${respVar}) ? 'Downloading…' : 'Download file'}
</button>
{isError(${respVar}) ? <p className="text-red-500">Failed to download.</p> : null}
${"```"}

<details><summary>Description</summary>
<p>Most users just need a button that saves the file. This variant handles object URL creation, filename extraction, click, and state reset.</p>
</details>

### 2) Auto-download on mount (e.g., “Your file is ready” page)
${"```tsx"}
useEffect(() => {
  ${actionName}(${paramsType ? paramsVar ?? '{}' : '{}'});
}, [${actionName}]);
${"```"}

<details><summary>Description</summary>
<p>Good for post-processing routes that immediately start a download.</p>
</details>

### 3) Manual handling (preview or custom filename)
${"```tsx"}
const [${respVar}, ${actionName}] = use${pascal}({ clearOnUnmount: true });

useEffect(() => {
  if (isSuccess(${respVar})) {
    const ct = ${respVar}.headers?.['content-type'] ?? 'application/octet-stream';
    const parts = Array.isArray(${respVar}.data) ? ${respVar}.data : [${respVar}.data];
    const url = URL.createObjectURL(new Blob(parts, { type: ct }));
    // preview/save with your own UI...
    return () => URL.revokeObjectURL(url);
  }
}, [${respVar}]);
${"```"}

<details><summary>Description</summary>
<p>Use when you need to inspect headers, show a preview, or control the filename/UI flow.</p>
</details>

---

## Behavior notes (what the auto-download variant does)
- Forces \`responseType: 'blob'\` and \`adapter: 'fetch'\`.
- If \`content-type\` is JSON, stringifies payload so the saved file is human-readable.
- Parses \`Content-Disposition\` to derive a filename; falls back to a default.
- Creates and clicks a temporary link, then **resets state to \`init\`**.

---

## Gotchas & Tips
- **Expose headers in CORS:** server should send  
  \`Access-Control-Expose-Headers: Content-Disposition, Content-Type\`
- **Disable double clicks:** guard with \`isPending(state)\`.
- **Revoke URLs** when you create them manually in the stateful variant.
- **iOS Safari:** blob downloads may open a new tab—consider server-side direct-download URLs for a smoother UX.

---

## Troubleshooting
- **No filename shown:** your server didn’t include \`Content-Disposition\`. Add it.
- **Got JSON instead of a file:** server returned \`application/json\` (maybe an error). The auto hook saves it as text; surface the error in UI.
- **Nothing happens on click:** ensure you’re using the **Download** variant and the request succeeds (check Network tab); verify CORS headers.

---
`;
}
