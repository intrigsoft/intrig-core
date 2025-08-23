import {
  camelCase,
  generatePostfix,
  pascalCase,
  ResourceDescriptor, RestData,
  typescript
} from "@intrig/plugin-sdk";
import * as path from 'path'
import {InternalGeneratorContext} from "../../../../internal-types.js"

export async function clientIndexTemplate(descriptors: ResourceDescriptor<RestData>[], ctx: InternalGeneratorContext) {
  const {source, data: {paths, operationId, responseType, contentType}} = descriptors[0]

  ctx.getCounter(source)?.inc("Endpoints");

  const ts = typescript(path.resolve('src', source, ...paths, camelCase(operationId), `client.ts`))

  const postfix = ctx.potentiallyConflictingDescriptors.includes(operationId) ? generatePostfix(contentType, responseType) : ''

  if (descriptors.length === 1) return ts`
    export { use${pascalCase(operationId)} } from './use${pascalCase(operationId)}${postfix}'
    export { use${pascalCase(operationId)}Async } from './use${pascalCase(operationId)}Async${postfix}'
  `

  const exports = descriptors
    .map(({data: {contentType, responseType}}) => {
      const postfix = ctx.potentiallyConflictingDescriptors.includes(operationId) ? generatePostfix(contentType, responseType) : ''
      return `
      export { use${pascalCase(operationId)} as use${pascalCase(operationId)}${postfix} } from './use${pascalCase(operationId)}${postfix}'
      export { use${pascalCase(operationId)}Async as use${pascalCase(operationId)}Async${postfix} } from './use${pascalCase(operationId)}Async${postfix}'
      `
    })
    .join('\n');

  return ts`
    ${exports}
  `
}
