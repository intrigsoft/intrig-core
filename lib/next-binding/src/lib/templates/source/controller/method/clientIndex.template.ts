import {
  camelCase, GeneratorContext, ResourceDescriptor, RestData,
  typescript
} from 'common';
import * as path from 'path'
import * as _ from "lodash";

export function nextClientIndexTemplate(
  requestProperties: ResourceDescriptor<RestData>[], clientExports: string[] = [], _path: string, ctx: GeneratorContext,
) {
  const { source, data: {paths, operationId} } =
    requestProperties[0];

  const ts = typescript(
    path.resolve(
      _path,
      'src',
      source,
      ...paths,
      camelCase(operationId),
      `client.ts`,
    ),
  );

  ctx.generatorCtx?.getCounter(source)?.inc("Client Side Endpoints")

  // if (requestProperties.length === 1)
  //   return ts`
  //   export { use${pascalCase(operationId)} } from './use${pascalCase(operationId)}${generatePostfix(contentType, responseType)}'
  // `;
  //
  // const exports = requestProperties
  //   .map(({ contentType, responseType }) => {
  //     return `export { use${pascalCase(operationId)} as use${pascalCase(operationId)}${generatePostfix(contentType, responseType)} } from './use${pascalCase(operationId)}${generatePostfix(contentType, responseType)}'`;
  //   })
  //   .join('\n');

  return ts`
    ${_.uniq(clientExports).join('\n')}
  `;
}
