import {
  camelCase,
  generatePostfix,
  GeneratorContext,
  pascalCase,
  ResourceDescriptor, RestData,
  typescript
} from 'common';
import * as path from 'path'

export async function reactClientIndexTemplate(descriptors: ResourceDescriptor<RestData>[], _path: string, ctx: GeneratorContext) {

  const {source, data: {paths, operationId, responseType, contentType}} = descriptors[0]

  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `client.ts`))

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
