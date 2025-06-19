import {camelCase, mdLiteral, pascalCase, ResourceDescriptor, RestData} from "common";

export function sseHookDocs(descriptor: ResourceDescriptor<RestData>) {
  const md = mdLiteral('sse-hook.md')

  const requestBody = descriptor.data.requestBody ? camelCase(descriptor.data.requestBody) : undefined
  const params = descriptor.data.variables?.filter(a => a.in.toUpperCase() ===  'PATH')?.length ? 'params' : undefined

  return md`
> Intrig-generated hooks are intended for backend data integration. They follow the same tuple-based API pattern as React’s built-in state hooks (e.g. useState). 

## Imports

#### Import the hook to the component.
${"```ts"}
import { use${pascalCase(descriptor.name)} } from '@intrig/react/${descriptor.path}/client';
${"```"}

#### Import the utility methods.
${"```ts"}
import { isSuccess } from '@intrig/react';
${"```"}

#### Use hook inside the component.

${"```tsx"}
const [${camelCase(descriptor.name)}Resp, ${camelCase(descriptor.name)}, clear${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}();
${"```"}

### Usage

#### Execute data fetching.

${"```tsx"}
useEffect(() => {
  ${camelCase(descriptor.name)}(${[requestBody, params ?? '{}'].filter(Boolean).join(', ')}); 
}, [${[requestBody, params].filter(Boolean).join(', ')}/* Dependencies */])  
${"```"}

#### Extract data from the response.
\`SSE\` hooks are a special kind of hook that delivers intermediate data updates as they are received.

##### Minimal example.
${"```tsx"}
const ${camelCase(descriptor.name)} = isPending(${camelCase(descriptor.name)}Resp) ? ${camelCase(descriptor.name)}Resp.data : null;
${"```"}

### Full example.

#### Short format.
You can pass the request body and params as props to the hook for initial data binding. This will create the data to be tightly coupled
with the component lifecycle.

> Usually the SSE-hooks are combined with a collector mechanism to get the complete message. 

<details>
<summary>Implementation</summary>

${"```tsx"}
import { use${pascalCase(descriptor.name)} } from '@intrig/react/${descriptor.path}/client';
import { isSuccess, isPending, isError } from '@intrig/react';
${requestBody ? `import { ${pascalCase(requestBody)} } from '@intrig/react/${descriptor.source}/components/schemas/${pascalCase(requestBody)}';` : ''}
${params ? `import { ${pascalCase(params)}Params } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}
import { useState, useEffect } from 'react';
import { LoadingIndicator, ErrorDisplay } from '@/components/ui'; //import from your project.
import {flushSync} from "react-dom";

${requestBody || params ? `
interface MyComponentProps {
  ${requestBody ? `${camelCase(requestBody)}: ${pascalCase(requestBody)};` : ''}
  ${params ? `${camelCase(params)}Params: ${pascalCase(params)}Params;` : ''}
}
` : ''}

function MyComponent(${requestBody || params ? 'props: MyComponentProps' : ''}) { 
const [${camelCase(descriptor.name)}Resp] = use${pascalCase(descriptor.name)}({
  fetchOnMount: true,
  clearOnUnmount: true,
  ${requestBody ? `body: props.${camelCase(requestBody)},` : ''}
  ${params ? `params: props.${camelCase(params)},` : 'params: {}'}
});

let [data, setData] = useState<${pascalCase(descriptor.name)}[]>([]);

useEffect(() => {
  if (isPending(${camelCase(descriptor.name)}Resp)) {
    flushSync(() => {                                                     //Sometimes react tends to skip intermediate renders for the performance. Use flushSync if you need to keep track of messages. 
      setData(data => [...data, ${camelCase(descriptor.name)}Resp.data]);
    })
  }
}, [${camelCase(descriptor.name)}Resp])

if (isPending(${camelCase(descriptor.name)}Resp)) {
  return <>{data.map(a => <>{JSON.stringify(a)}</>)}</>
}

if (isError(${camelCase(descriptor.name)}Resp)) {
  return <ErrorDisplay error={${camelCase(descriptor.name)}Resp.error}/> //TODO add your error view here.
}

return <> 
  Completed: {JSON.stringify(data)}  
</>
}
${"```"}
</details>

#### Controlled format.
If you need more control over the data binding, where the data control is outside of the component lifecycle, 
you can use the actions provided by the hook.

<details>
<summary>Implementation</summary>

${"```tsx"}
import { use${pascalCase(descriptor.name)} } from '@intrig/react/${descriptor.path}/client';
import { isSuccess } from '@intrig/react';
${requestBody ? `import { ${pascalCase(requestBody)} } from '@intrig/react/${descriptor.source}/components/schemas/${pascalCase(requestBody)}';` : ''}
${params ? `import { ${pascalCase(params)}Params } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}
import {flushSync} from "react-dom";

${requestBody || params ? `
interface MyComponentProps {
  ${requestBody ? `${camelCase(requestBody)}: ${pascalCase(requestBody)};` : ''}
  ${params ? `${camelCase(params)}Params: ${pascalCase(params)}Params;` : ''}
}
` : ''}

function MyComponent() {
const [${camelCase(descriptor.name)}Resp, ${camelCase(descriptor.name)}, clear${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}();

useEffect(() => { 
  ${camelCase(descriptor.name)}(${requestBody ? `${camelCase(requestBody)},` : ''} ${params ? `${camelCase(params)},` : '{}'}) //Call the fetch function. 
  return clear${pascalCase(descriptor.name)}; //Clear the data on unmount.
}, [])

let [data, setData] = useState<${pascalCase(descriptor.name)}[]>([]);

useEffect(() => {
  if (isPending(${camelCase(descriptor.name)}Resp)) {
    flushSync(() => {                                                     //Sometimes react tends to skip intermediate renders for the performance. Use flushSync if you need to keep track of messages. 
      setData(data => [...data, ${camelCase(descriptor.name)}Resp.data]);
    })
  }
}, [${camelCase(descriptor.name)}Resp])

if (isPending(${camelCase(descriptor.name)}Resp)) {
  return <>{data.map(a => <>{JSON.stringify(a)}</>)}</>
}

if (isError(${camelCase(descriptor.name)}Resp)) {
  return <ErrorDisplay error={${camelCase(descriptor.name)}Resp.error}/> //TODO add your error view here.
}

return <> 
  Completed: {JSON.stringify(data)}  
</>
}
${"```"}
</details>

  `
}