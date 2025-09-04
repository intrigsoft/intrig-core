import {
  camelCase, ResourceDescriptor, RestData,
  typescript
} from '@intrig/plugin-sdk';
import * as path from 'path';
import * as _ from "lodash";
import { InternalGeneratorContext } from '../../../../internal-types.js';

export function serverIndexTemplate(
  requestProperties: ResourceDescriptor<RestData>[], 
  serverExports: string[] = [],
  internalGeneratorContext: InternalGeneratorContext,
) {
  const { source, data: {paths, operationId} } =
    requestProperties[0];

  const ts = typescript(
    path.resolve(
      'src',
      source,
      ...paths,
      camelCase(operationId),
      `server.ts`,
    ),
  );

  internalGeneratorContext.getCounter(source)?.inc("Server Side Endpoints")

  return ts`
    ${_.uniq(serverExports).join('\n')}
  `;
}