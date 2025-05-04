import {
  camelCase, ResourceDescriptor, RestData,
  typescript
} from 'common';
import * as path from 'path'
import * as _ from "lodash";

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

  return ts`
    ${_.uniq(serverExports).join('\n')}
  `;
}
