import {camelCase, mdLiteral, pascalCase, ResourceDescriptor, RestData} from 'common'

export function nextReactHookDocs(descriptor: ResourceDescriptor<RestData>) {
  const md = mdLiteral('react-hook.md')

  const requestBody = descriptor.data.requestBody ? camelCase(descriptor.data.requestBody) : undefined
  const params = descriptor.data.variables?.filter(a => a.in.toUpperCase() ===  'PATH')?.length ? 'params' : undefined

  return md`

<hint>
Test
</hint>

> Intrig-generated hooks are intended for backend data integration. They follow the same tuple-based API pattern as React’s built-in state hooks (e.g. useState).

## Imports

#### Import the hook to the component.
${"```ts"}
import { use${pascalCase(descriptor.name)} } from '@intrig/next/${descriptor.path}/client';
${"```"}

#### Import the utility methods.
${"```ts"}
import { isSuccess } from '@intrig/next';
${"```"}

#### Use hook inside the component.

${"```tsx"}
const [${camelCase(descriptor.name)}Resp, ${camelCase(descriptor.name)}, clear${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}();
${"```"}

#### Execute data fetching.

${"```tsx"}
useEffect(() => {
  ${camelCase(descriptor.name)}(${[requestBody, params ?? '{}'].filter(Boolean).join(', ')}); 
}, [${[requestBody, params].filter(Boolean).join(', ')}/* Dependencies */])  
${"```"}

#### Extract the data from the response.

${"```tsx"}
const ${camelCase(descriptor.name)} = isSuccess(${camelCase(descriptor.name)}Resp) ? ${camelCase(descriptor.name)}Resp.data : null;
${"```"}


## Full examples

#### Short format.
You can pass the request body and params as props to the hook for initial data binding. This will create the data to be tightly coupled
with the component lifecycle.

<details>
<summary>Implementation</summary>

${"```tsx"}
import { use${pascalCase(descriptor.name)} } from '@intrig/next/${descriptor.path}/client';
import { isSuccess, isPending, isError } from '@intrig/next';
${requestBody ? `import { ${pascalCase(requestBody)} } from '@intrig/next/${descriptor.source}/components/schemas/${pascalCase(requestBody)}';` : ''}
${params ? `import { ${pascalCase(params)}Params } from '@intrig/next/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}
import { useMemo } from 'react';
import { LoadingIndicator, ErrorDisplay } from '@/components/ui'; //import from your project.

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

const data = useMemo(()=> {
  if (isSuccess(${camelCase(descriptor.name)}Resp)) {
    return ${camelCase(descriptor.name)}Resp.data;
  }
}, [${camelCase(descriptor.name)}Resp])

if (isPending(${camelCase(descriptor.name)}Resp)) {
  return <LoadingIndicator/> //TODO add your loading indicator here.
}

if (isError(${camelCase(descriptor.name)}Resp)) {
  return <ErrorDisplay error={${camelCase(descriptor.name)}Resp.error}/> //TODO add your error view here.
}

return <>
  {JSON.stringify(data)}  
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
import { use${pascalCase(descriptor.name)} } from '@intrig/next/${descriptor.path}/client';
import { isSuccess } from '@intrig/next';
${requestBody ? `import { ${pascalCase(requestBody)} } from '@intrig/next/${descriptor.source}/components/schemas/${pascalCase(requestBody)}';` : ''}
${params ? `import { ${pascalCase(params)}Params } from '@intrig/next/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}

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

if (isPending(${camelCase(descriptor.name)}Resp)) {
  return <>Loading...</> //TODO add your loading indicator here.
}

if (isError(${camelCase(descriptor.name)}Resp)) {
  return <>An error occurred: {JSON.stringify(${camelCase(descriptor.name)}Resp.error)}</> //TODO add your error view here.
}

return <>
  {JSON.stringify(data)} 
</>
}
${"```"}

</details>

#### Passive usage.
In some cases you may want to passively observe the data and show some contents. In such cases you can skip the data control
altogether and observe data directly.

<details>
<summary>Implementation</summary>

${"```tsx"}
import { use${pascalCase(descriptor.name)} } from '@intrig/next/${descriptor.path}/client';
import { isSuccess } from '@intrig/next';

function MyComponent() {
  const [${camelCase(descriptor.name)}Resp] = use${pascalCase(descriptor.name)}()
  
  if (isSuccess(${camelCase(descriptor.name)}Resp)) {
    return <>{${camelCase(descriptor.name)}Resp.data}</> Do something with the data.  
  }
}
${"```"}

</details>

## Use Cases and patterns

### Binding to lifecycle events

Often times you may want to bind your data to the components. In that case, you can use the following patterns. 

<details>
<summary>Fetch on Mount</summary>
In some cases, you may want to fetch data on the component mount. There are two methods to achieve this.

### 1. Shorthand.

${"```tsx"}
const [${camelCase(descriptor.name)}Resp] = use${pascalCase(descriptor.name)}({
  fetchOnMount: true,
  ${requestBody ? `body: ${camelCase(requestBody)},` : ''}
  ${params ? `params: ${camelCase(params)},` : 'params: {}'}
})
${"```"}

In here the params object is mandatory to execute the fetch call.  

### 2. Descriptive.

${"```tsx"}
const [${camelCase(descriptor.name)}Resp, ${camelCase(descriptor.name)}] = use${pascalCase(descriptor.name)}();

useEffect(() => {
${camelCase(descriptor.name)}(${requestBody ? `${camelCase(requestBody)},` : ''} ${params ? `${camelCase(params)},` : '{}'}) 
}, [])
${"```"}
</details>

<details>
<summary>Clear on Unmount</summary>
Its always a good practice to cleanup the data on unmount. There are two methods to achieve this.

### 1. Shorthand.

${"```tsx"}
const [${camelCase(descriptor.name)}Resp] = use${pascalCase(descriptor.name)}({ clearOnUnmount: true });
${"```"}

### 2. Descriptive.
${"```tsx"}
const [${camelCase(descriptor.name)}Resp, ,clear${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}();

useEffect(() => clear${pascalCase(descriptor.name)}, [])
${"```"}
</details>

### Extracting response data

The type of response is in the algebraic data type \`NetworkState<T>\`, which may be in one of \`InitState\`, \`PendingState\`, \`SuccessState\`, \`ErrorState\`. Each state represents
a state of a network operation. Intrig uses the powerful typescript type guards to distinguish between the states and extract the data.

#### Success state

The success state extraction is done using the \`isSuccess\` utility method. Make sure to import the method into your component.

${"```tsx"}
import { isSuccess } from '@intrig/next';
${"```"}

<details>
<summary>Simple Extraction</summary>
The simplest form of success data extraction is the turnary operator. 

${"```tsx"}
const ${camelCase(descriptor.name)}Data = isSuccess(${camelCase(descriptor.name)}Resp) ? ${camelCase(descriptor.name)}Resp.data : undefined;
${"```"}
</details>

<details>
<summary>Memorize data</summary>
Use memo makes sure that the response is memorized, saving a split seconds on subsequent renders.

First import the \`useMemo\` hook.
${"```tsx"}
import { useMemo } from 'react';
${"```"}

Then extract the data using the \`isSuccess\` utility method.
${"```tsx"}
const ${camelCase(descriptor.name)}Data = useMemo(() => isSuccess(${camelCase(descriptor.name)}Resp) ? ${camelCase(descriptor.name)}Resp.data : undefined, [${camelCase(descriptor.name)}Resp])
${"```"}
</details>

<details>
<summary>Bind to a state (hide loading state)</summary>
In some cases, you may want to show the previous results until results are loaded. In that case, you can use the following pattern.

First import the \`useState\` and \`useEffect\` hooks.
${"```tsx"}
import { useState, useEffect } from 'react';
${"```"}

Then extract the data to the state.
${"```tsx"}
const [${camelCase(descriptor.name)}Data, set${pascalCase(descriptor.name)}Data] = useState<${pascalCase(descriptor.name)}Data | undefined>(undefined);

useEffect(() => {
  if (isSuccess(${camelCase(descriptor.name)}Resp)) {
  set${pascalCase(descriptor.name)}Data(${camelCase(descriptor.name)}Resp.data);
  }
}, [${camelCase(descriptor.name)}Resp])
${"```"}
</details>

<details>
<summary>Inline response</summary>
Sometimes, you may want to inline the response into the component jsx.

${"```tsx"}
<>{isSuccess(${camelCase(descriptor.name)}Resp) ? ${camelCase(descriptor.name)}Resp.data : null}</>
${"```"}
</details>

#### Pending state
The pending state extraction is done using the \`isPending\` utility method. Make sure to import the method into your component.

${"```tsx"}
import { isPending } from '@intrig/next';
${"```"}

<details>
<summary>Early Return</summary>
Often times you may need to show the loading indicators while the actual network call is in progress. In that case, you can add a conditional early return.

${"```tsx"}
if (isPending(${camelCase(descriptor.name)}Resp)) {
  return <LoadingIndicator />
}
${"```"}
</details>

<details>
<summary>Inline rendering</summary>
If you need to show a non-blocking/parallel loading indicator, or change the component behavior based on the loading state, you can inline the loading condition.
 
${"```tsx"}
<>{isPending(${camelCase(descriptor.name)}Resp) ? <LoadingIndicator /> : null}<MyComponent /></>
${"```"}
</details>

#### Error state
The error state extraction is done using the \`isError\` utility method. Make sure to import the method into your component.

${"```tsx"}
import { isError } from '@intrig/next';
${"```"}

<details>
<summary>Early return</summary>
In most cases, in an error state, you may want to show the error message to the user instead of real component. In that case, you can add a conditional early return.

${"```tsx"}
if (isError(${camelCase(descriptor.name)}Resp)) {
return <ErrorMessage />
}
${"```"}
</details>

<details>
<summary>Inline rendering</summary>
If you need to show a non-blocking/parallel error indicator, or change the component behavior based on the error state, you can inline the error condition.

${"```tsx"}
<>{isError(${camelCase(descriptor.name)}Resp) ? <ErrorMessage /> : null}<MyComponent /></>
${"```"}
</details>

<details>
<summary>Side effect upon error</summary>

Usually if the operation is an update, you may need to show an error message to the user. In such cases, you can add a side effect with useEffect, upon error.

First import \`useEffect\` to your component.
${"```tsx"}
import { useEffect } from 'react'
${"```"}

Then add the side effect.
${"```tsx"}
useEffect(() => {
  if (isError(${camelCase(descriptor.name)}Resp)) {
    //TODO execute error related operation.
  }
}, [${camelCase(descriptor.name)}Resp])
${"```"}
</details>

### Replications

<details>
<summary>Multiple instances for same hook.</summary>

In some case you may need to instanciate multiple instances of the same request. For an example comparision of the products.
In that cases, you can use \`key\` property to distinguish between these Network states. 

${'```tsx'}
const [${camelCase(descriptor.name)}Resp, ${camelCase(descriptor.name)}, clear${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}({ key: 'id1' });
${'```'} 
</details>


`
}