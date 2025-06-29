import {
  camelCase, ResourceDescriptor, RestData,
  typescript
} from '@intrig/common';
import * as path from 'path'
import * as _ from "lodash";

export function clientIndexTemplate(
  requestProperties: ResourceDescriptor<RestData>[],
  clientExports: string[] = [],
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
      `client.ts`,
    ),
  );

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
