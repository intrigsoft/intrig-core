# **Intrig Quickstart Guide**

This guide walks you through setting up **Intrig**, generating your first SDK, and making your first API call from a **React** project. For other frameworks like Next.js, Remix, and Vue, see the [Other Framework Guides](#) *(placeholder link)*.

---

## **1. Install Intrig**

For React projects, simply install the required Intrig packages locally:

```bash
npm install @intrig/core @intrig/react
# or
yarn add @intrig/core @intrig/react
```

⚠️ **Warning:** Do **not** use `npx intrig` at this time, as it refers to an older iteration of the tool. This issue will be fixed soon.

---

## **2. Initialize Intrig in Your Project**

From your React project root:

```bash
intrig init
```

Running `intrig init` will:

1. Ensure that the related SDK placeholder library (`@intrig/react`) is installed.
2. Create an `intrig.config.json` file with a basic setup.
3. Update `.gitignore` to prevent temporary directories from being committed.

**Basic `intrig.config.json` structure:**

```json
{
  "$schema": "https://raw.githubusercontent.com/intrigsoft/intrig-core/refs/heads/main/docs/schema.json",
  "sources": [],
  "generator": "react"
}
```

---

## **3. (Optional) Run the Demo Backend**

For a ready-to-use API to test Intrig, clone and run the **[intrig-demo-backend](https://github.com/intrigsoft/intrig-demo-backend)** — a public NestJS-based backend that generates a genuine Swagger document and provides working endpoints.

```bash
git clone https://github.com/intrigsoft/intrig-demo-backend.git
cd intrig-demo-backend
npm install
npm run start
```

Once running, the Swagger documentation will be available at:

```
http://localhost:5001/swagger.json
```

---

## **4. Add API Sources**

Once initialized, add your API source:

```bash
intrig sources add
```

This command is interactive — you will be prompted to provide:

* **id**: A path name–compliant identifier for the source (prefer simple `camelCase`, e.g., `productApi`).
* **OpenAPI/Swagger documentation URL**: For the demo backend, use `http://localhost:5001/swagger.json`.

After completion, a new entry will be added to the `sources` array in your `intrig.config.json`.

---

## **5. Generate and Publish SDK**

Run:

```bash
intrig generate
```

This will:

1. Generate the source code of the SDK.
2. Compile the SDK codebase.
3. Publish the SDK codebase into `node_modules` so it’s ready for use.

After this step, your code is ready to be imported and used in your React project.

---

## **6. (Optional) Explore with Intrig Insight**

To explore the generated SDK in a documentation site:

```bash
intrig insight
```

This will open **Intrig Insight**, where you can:

* Search and browse generated hooks.
* View detailed documentation for request/response types.
* Learn about available data types and usage patterns.

---

## **7. Add IntrigProvider to Your Project Root**

Wrap your application with `IntrigProvider` to configure backend integration:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IntrigProvider } from '@intrig/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntrigProvider configs={{
      productApi: {
        // Configure baseUrls, headers, and other backend integration settings here
      },
      defaults: {
        // Configure default settings such as Auth headers here.
      }
    }}>
      <App />
    </IntrigProvider>
  </StrictMode>,
)
```

In the `configs` prop, you can set **base URLs**, **headers**, and other integration options related to your backend. See the [Intrig Configuration Reference](#) for all available options.

---

## **8. Use the Generated Hook**

Here’s a typical usage pattern (stateful hooks return `[state, call]`):

```tsx
import {useGetEmployee} from '@intrig/react/employeeApi/Employee/getEmployee/useGetEmployee'
import {useEffect} from 'react';
import {isSuccess} from '@intrig/react';
import {isError} from '@intrig/react/network-state';

function MyComponent() {
  const [getEmployeeResp, getEmployee] = useGetEmployee({ clearOnUnmount: true });

  useEffect(() => {
    getEmployee({ id: 1 });
  }, []);
  
  if (isError(getEmployeeResp)) return (
    <div>Error fetching employee</div>
  );

  return (
    <>
      {isSuccess(getEmployeeResp) && (
        <div>{getEmployeeResp.data.name}</div>
      )}
    </>
  );
}

export default MyComponent;
```

You can easily discover generated hooks and their usage examples in **Intrig Insight** (`intrig insight`).

---

## **9. Regenerate on API Changes**

If there’s any API change:

1. Run `intrig sync` to fetch the updated API specification.
2. Run `intrig generate` to regenerate and publish the updated SDK.

---

## **Next Steps**

* [📄 Full Documentation](https://intrig.dev) *(placeholder link)*
* [Other Framework Guides](#)
* [Intrig Configuration Reference](#)
