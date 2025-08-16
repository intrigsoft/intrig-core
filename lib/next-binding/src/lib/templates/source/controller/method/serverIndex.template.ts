import {
  camelCase, GeneratorContext, ResourceDescriptor, RestData,
  typescript
} from 'common';
import * as path from 'path'
import * as _ from "lodash";

export function nextServerIndexTemplate(
  requestProperties: ResourceDescriptor<RestData>[], serverExports: string[] = [], _path: string, ctx: GeneratorContext,
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

  ctx.generatorCtx?.getCounter(source)?.inc("Server Side Endpoints")

  return ts`
    ${_.uniq(serverExports).join('\n')}
  `;
}
