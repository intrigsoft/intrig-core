import {
  camelCase, ResourceDescriptor, RestData,
  typescript
} from '@intrig/common';
import * as path from 'path'

export function serverIndexTemplate(
  requestProperties: ResourceDescriptor<RestData>[],
  serverExports: string[] = [],
  _path: string,
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
      `server.ts`,
    ),
  );

  // if (requestProperties.length === 1)
  //   return ts`
  //   export { ${camelCase(operationId)} } from './${camelCase(operationId)}${generatePostfix(contentType, responseType)}'
  // `;
  //
  // const exports = requestProperties
  //   .map(({ contentType, responseType }) => {
  //     return `export { ${camelCase(operationId)} as ${camelCase(operationId)}${generatePostfix(contentType, responseType)} } from './${camelCase(operationId)}${generatePostfix(contentType, responseType)}'`;
  //   })
  //   .join('\n');

  return ts`
    ${serverExports.join('\n')}
  `;
}
