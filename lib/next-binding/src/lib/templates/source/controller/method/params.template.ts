import {camelCase, decodeVariables, pascalCase, ResourceDescriptor, RestData, typescript} from "common";
import * as path from "path";

export function paramsTemplate(
  {
    source,
    data: {
      paths,
      operationId,
      requestUrl,
      variables,
    }
  }: ResourceDescriptor<RestData>,
  clientExports: string[],
  serverExports: string[],
  sourcePath: string,
) {
  const ts = typescript(
    path.resolve(
      sourcePath,
      'src',
      source,
      ...paths,
      camelCase(operationId),
      `${pascalCase(operationId)}.params.ts`,
    ),
  );

  const { variableImports, variableTypes } = decodeVariables(
    variables ?? [],
    source,
    '@intrig/next',
  );

  clientExports.push(`export type {${pascalCase(operationId)}Params} from './${pascalCase(operationId)}.params'`);
  serverExports.push(`export type {${pascalCase(operationId)}Params} from './${pascalCase(operationId)}.params'`);

  return ts`
     ${variableImports}

     export interface ${pascalCase(operationId)}Params extends Record<string, any> {
      ${variableTypes}
    }
  `;
}
