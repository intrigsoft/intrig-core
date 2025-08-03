import {
  camelCase,
  generatePostfix,
  pascalCase,
  ResourceDescriptor, RestData,
  typescript
} from 'common';
import * as path from 'path'

export async function reactClientIndexTemplate(descriptors: ResourceDescriptor<RestData>[], _path: string) {

  const {source, data: {paths, operationId, responseType, contentType}} = descriptors[0]

  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `client.ts`))

  if (descriptors.length === 1) return ts`
    export { use${pascalCase(operationId)} } from './use${pascalCase(operationId)}${generatePostfix(contentType, responseType)}'
    export { use${pascalCase(operationId)}Async } from './use${pascalCase(operationId)}Async${generatePostfix(contentType, responseType)}'
  `

  const exports = descriptors
    .map(({data: {contentType, responseType}}) => {
      return `
      export { use${pascalCase(operationId)} as use${pascalCase(operationId)}${generatePostfix(contentType, responseType)} } from './use${pascalCase(operationId)}${generatePostfix(contentType, responseType)}'
      export { use${pascalCase(operationId)}Async as use${pascalCase(operationId)}Async${generatePostfix(contentType, responseType)} } from './use${pascalCase(operationId)}Async${generatePostfix(contentType, responseType)}'
      `
    })
    .join('\n');

  return ts`
    ${exports}
  `
}
