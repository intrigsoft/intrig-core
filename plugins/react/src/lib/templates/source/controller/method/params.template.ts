import {
  camelCase,
  decodeVariables,
  pascalCase,
  ResourceDescriptor,
  RestData,
  typescript
} from "@intrig/plugin-sdk";
import * as path from "path";
import {InternalGeneratorContext} from "../../../../internal-types.js";

export async function paramsTemplate({
                                            source,
                                            data: {paths, operationId, variables}
                                          }: ResourceDescriptor<RestData>, ctx: InternalGeneratorContext) {
  const ts = typescript(path.resolve('src', source, ...paths, camelCase(operationId), `${pascalCase(operationId)}.params.ts`))

  const {variableImports, variableTypes} = decodeVariables(variables ?? [], source, "@intrig/react");

  if (variableTypes.length === 0) return ts`
  export type ${pascalCase(operationId)}Params = Record<string, any>
  `

  return ts`
     ${variableImports}

     export interface ${pascalCase(operationId)}Params extends Record<string, any> {
      ${variableTypes}
    }
  `
}
