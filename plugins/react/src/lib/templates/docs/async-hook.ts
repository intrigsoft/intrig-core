import { camelCase, mdLiteral, pascalCase, ResourceDescriptor, RestData } from "@intrig/plugin-sdk"

export function reactAsyncFunctionHookDocs(descriptor: ResourceDescriptor<RestData>) {
  const md = mdLiteral('async-hook.md')

  // ===== Derived names (preserve these) =====
  const hasPathParams = (descriptor.data.variables ?? []).some(
    (v: any) => v.in?.toUpperCase() === 'PATH',
  )

  const actionName = camelCase(descriptor.name)                  // e.g. getUser
  const abortName = `abort${pascalCase(descriptor.name)}`       // e.g. abortGetUser

  const requestBodyVar = descriptor.data.requestBody
    ? camelCase(descriptor.data.requestBody)                    // e.g. createUser
    : undefined
  const requestBodyType = descriptor.data.requestBody
    ? pascalCase(descriptor.data.requestBody)                   // e.g. CreateUser
    : undefined

  const paramsVar = hasPathParams ? `${actionName}Params` : undefined          // e.g. getUserParams
  const paramsType = hasPathParams ? `${pascalCase(descriptor.name)}Params` : undefined // e.g. GetUserParams
  const responseTypeName = `${pascalCase(descriptor.name)}ResponseBody`        // e.g. GetUserResponseBody

  const callArgs = [requestBodyVar, paramsVar].filter(Boolean).join(', ')

  return md`
# Intrig Async Hooks — Quick Guide

## Copy-paste starter (fast lane)

### 1) Hook import
${"```ts"}
import { use${pascalCase(descriptor.name)}Async } from '@intrig/react/${descriptor.path}/client';
${"```"}

### 2) Create an instance
${"```ts"}
const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();
${"```"}

### 3) Call it (awaitable)
${"```ts"}
// body?, params? — pass what your endpoint needs (order: body, params)
await ${actionName}(${callArgs});
${"```"}

Async hooks are for one-off, low-friction calls (e.g., validations, submissions). They return an **awaitable function** plus an **abort** function. No NetworkState.

---

## TL;DR (copy–paste)
${"```tsx"}
import { use${pascalCase(descriptor.name)}Async } from '@intrig/react/${descriptor.path}/client';
import { useCallback, useEffect } from 'react';

export default function Example() {
  const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();

  const run = useCallback(async () => {
    try {
      const result = await ${actionName}(${callArgs});
      // do something with result
      console.log(result);
    } catch (e) {
      // request failed or was aborted
      console.error(e);
    }
  }, [${actionName}]);

  // Optional: abort on unmount
  useEffect(() => ${abortName}, [${abortName}]);

  return <button onClick={run}>Call</button>;
}
${"```"}

### Type Imports

These types are generated and available for import:

${"```ts"}
${requestBodyType ? `// Request body type
import type { ${requestBodyType} } from '@intrig/react/${descriptor.source}/components/schemas/${requestBodyType}';
` : ''}${paramsType ? `// Path/query parameters type
import type { ${paramsType} } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.params';
` : ''}// Response type
import type { ${responseTypeName} } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.response';
${"```"}

> **Tip:** Always import types from the SDK rather than defining them inline. This ensures type safety and keeps your code in sync with the API.

---

## Hook API
${"```ts"}
// Prefer concrete types if your build emits them:
// import type { ${responseTypeName} } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.response';
// ${paramsType ? `import type { ${paramsType} } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}

type ${pascalCase(descriptor.name)}Data = ${'unknown'}; // replace with ${responseTypeName} if generated
type ${pascalCase(descriptor.name)}Request = {
  body?: ${requestBodyType ?? 'unknown'};
  params?: ${paramsType ?? 'unknown'};
};

// Signature (shape shown; return type depends on your endpoint)
declare function use${pascalCase(descriptor.name)}Async(): [
  (body?: ${pascalCase(descriptor.name)}Request['body'], params?: ${pascalCase(descriptor.name)}Request['params']) => Promise<${pascalCase(descriptor.name)}Data>,
  () => void // abort
];
${"```"}

### Why async hooks?
- **No state machine:** just \`await\` the result.
- **Great for validations & submits:** uniqueness checks, field-level checks, updates.
- **Abortable:** cancel in-flight work on demand.

---

## Usage Patterns

### 1) Simple try/catch (recommended)
${"```tsx"}
const [${actionName}] = use${pascalCase(descriptor.name)}Async();

try {
  const res = await ${actionName}(${callArgs});
  // use res
} catch (e) {
  // network error or abort
}
${"```"}

<details><summary>Description</summary>
<p><strong>Use when</strong> you just need the value or an error. Ideal for validators, uniqueness checks, or quick lookups.</p>
</details>

### 2) Abort on unmount (safe cleanup)
${"```tsx"}
const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();

useEffect(() => ${abortName}, [${abortName}]);
${"```"}

<details><summary>Description</summary>
<p><strong>Use when</strong> the component may unmount while a request is in-flight (route changes, conditional UI).</p>
</details>

### 3) Debounced validation (e.g., on input change)
${"```tsx"}
const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();

const onChange = useMemo(() => {
  let t: any;
  return (${requestBodyVar ? `${requestBodyVar}: ${requestBodyType ?? 'any'}` : 'value: string'}) => {
    clearTimeout(t);
    t = setTimeout(async () => {
      try {
        // Optionally abort before firing a new request
        ${abortName}();
        await ${actionName}(${[requestBodyVar ?? '/* body from value */', paramsVar ?? '/* params? */'].join(', ')});
      } catch {}
    }, 250);
  };
}, [${actionName}, ${abortName}]);
${"```"}

<details><summary>Description</summary>
<p><strong>Use when</strong> validating as the user types. Debounce to reduce chatter; consider <code>${abortName}()</code> before firing a new call.</p>
</details>

### 4) Guard against races (latest-only)
${"```tsx"}
const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();

const latestOnly = async () => {
  ${abortName}();
  return ${actionName}(${callArgs});
};
${"```"}

<details><summary>Description</summary>
<p><strong>Use when</strong> only the most recent call should win (search suggestions, live filters).</p>
</details>

---

## Full example
${"```tsx"}
import { use${pascalCase(descriptor.name)}Async } from '@intrig/react/${descriptor.path}/client';
import { useCallback } from 'react';

function MyComponent() {
  const [${actionName}, ${abortName}] = use${pascalCase(descriptor.name)}Async();

  const run = useCallback(async () => {
    try {
      const data = await ${actionName}(${callArgs});
      alert(JSON.stringify(data));
    } catch (e) {
      console.error('Call failed/aborted', e);
    }
  }, [${actionName}]);

  return (
    <>
      <button onClick={run}>Call remote</button>
      <button onClick={${abortName}}>Abort</button>
    </>
  );
}
${"```"}

---

## Gotchas & Tips
- **No \`NetworkState\`:** async hooks return a Promise, not a state machine.
- **Abort:** always available; call it to cancel the latest in-flight request.
- **Errors:** wrap calls with \`try/catch\` to handle network failures or abort errors.
- **Debounce & throttle:** combine with timers to cut down chatter for typeahead/validators.
- **Types:** prefer generated \`${responseTypeName}\` and \`${paramsType ?? '...Params'}\` if your build emits them.

---

## Reference: Minimal cheat sheet
${"```ts"}
const [fn, abort] = use${pascalCase(descriptor.name)}Async();
await fn(${callArgs});
abort(); // optional
${"```"}
`
}
