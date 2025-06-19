import {camelCase, mdLiteral, pascalCase, ResourceDescriptor, RestData} from 'common'

export function asyncFunctionHookDocs(descriptor: ResourceDescriptor<RestData>) {
  const md = mdLiteral('async-hook.md')

  const requestBody = descriptor.data.requestBody ? camelCase(descriptor.data.requestBody) : undefined
  const params = descriptor.data.variables?.filter(a => a.in.toUpperCase() ===  'PATH')?.length ? 'params' : undefined

  return md`
  
> Intrig generated async hooks are intended to use for the rapid usecases like validations. This effectively bypasses the network-state management.
> The async hooks follow the tuple-based API pattern as React's built-in state hooks (e.g. useState).

## Imports

#### Import the hook to the component.
${"```ts"}
import { use${pascalCase(descriptor.name)}Async } from '@intrig/react/${descriptor.path}/client';
${"```"}

#### Use hook inside the component.

${"```tsx"}
const [${camelCase(descriptor.name)}, abort${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}Async();
${"```"}

#### Execute data fetching / calling.

${"```tsx"}
const fn = useCallback(async () => {
  let ${camelCase(descriptor.name)}Data = await ${camelCase(descriptor.name)}(${[requestBody, params ?? '{}'].filter(Boolean).join(', ')});
  //TODO do something with the ${camelCase(descriptor.name)}Data.
  return ${camelCase(descriptor.name)}Data; 
}, [${[requestBody, params].filter(Boolean).join(', ')}/* Dependencies */])

${"```"}

## Full example

<details>
<summary>Implementation</summary>

${"```tsx"}
import { use${pascalCase(descriptor.name)}Async } from '@intrig/react/${descriptor.path}/client';
${requestBody ? `import { ${pascalCase(requestBody)} } from '@intrig/react/${descriptor.source}/components/schemas/${pascalCase(requestBody)}';` : ''}
${params ? `import { ${pascalCase(params)}Params } from '@intrig/react/${descriptor.path}/${pascalCase(descriptor.name)}.params';` : ''}
import { useCallback } from 'react';

${requestBody || params ? `
interface MyComponentProps {
  ${requestBody ? `${camelCase(requestBody)}: ${pascalCase(requestBody)};` : ''}
  ${params ? `${camelCase(params)}Params: ${pascalCase(params)}Params;` : ''}
}
` : ''}

function MyComponent(${requestBody || params ? 'props: MyComponentProps' : ''}) {
const [${camelCase(descriptor.name)}, abort${pascalCase(descriptor.name)}] = use${pascalCase(descriptor.name)}Async();

const fn = useCallback(async (${[requestBody, params].filter(Boolean).join(', ')}) => {
  return await ${camelCase(descriptor.name)}(${[requestBody, params].filter(Boolean).join(', ')});
}, [/* Dependencies */])

//use fn where remote callback is needed.
return <>
  <button onClick={() => fn(${[requestBody, params].filter(Boolean).map(a => `props.${a}`).join(', ')})}>Call remote</button>  
</>
}
 
${"```"}
</details>

<hint>
//TODO improve with usecases
</hint>
  
  `
}