import {
  camelCase,
  decodeVariables,
  pascalCase,
  ResourceDescriptor,
  RestData,
  typescript
} from "common";
import * as path from "path";

export async function reactParamsTemplate({source, data: {paths, operationId, variables}}: ResourceDescriptor<RestData>, _path: string) {
  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `${pascalCase(operationId)}.params.ts`))

  const {variableImports, variableTypes} = decodeVariables(variables ?? [], source, "@intrig/react");

  return ts`
     ${variableImports}

     export interface ${pascalCase(operationId)}Params extends Record<string, any> {
      ${variableTypes}
    }
  `
}
