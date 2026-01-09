import {ErrorResponse, RestData, Variable} from "../model/rest-resource-data";

export function getVariableName(ref: string | undefined) {
  if (!ref) return undefined;
  return ref.split('/').pop()
}

export function getVariableImports(variables: Variable[], source: string, prefix: string) {
  return variables
    .filter(a => a.ref) // Skip variables without schema refs
    .map(a => getVariableName(a.ref))
    .filter((ref): ref is string => !!ref)
    .map((ref) => `import { ${ref} } from "${prefix}/${source}/components/schemas/${ref}"`)
    .join("\n");
}

export function getVariableTypes(variables: Variable[]) {
  return variables.map((p) => {
    const typeName = getVariableName(p.ref) ?? 'any'; // Use 'any' for inline schemas
    return `${p.name}${p.in === "path" ? "": "?"}: ${typeName}`;
  }).join("\n")
}

export function isParamMandatory(variables: Variable[]) {
  return variables.some(a => a.in === 'path');
}

export function getParamExplodeExpression(variables: Variable[]) {
  return [
    ...variables.filter(a => a.in === "path").map(a => a.name),
    "...params"
  ].join(",");
}

export function decodeVariables(_variables: Variable[], source: string, prefix = "@root") {
  const variables = _variables.filter(a => ["path", "query"].includes(a.in))
  return {
    variableImports: getVariableImports(variables, source, prefix),
    variableTypes: getVariableTypes(variables),
    isParamMandatory: isParamMandatory(variables),
    variableExplodeExpression: getParamExplodeExpression(variables)
  }
}

export function getDispatchParams(operationId: string, requestBody?: string, isParamMandatory = false) {
  return [
    requestBody ? `data: RequestBody` : undefined,
    `params: Params${isParamMandatory ? '' : ' | undefined'}`
  ]
    .filter(Boolean)
    .join(', ')
}

export function getDispatchParamExpansion(requestBody?: string, isParamMandatory?: boolean) {
  return [
    requestBody && 'data',
    `p${isParamMandatory ? '' : ' = {}'}`
  ].filter(Boolean).join(', ');
}

export function extractParams(properties: RestData): {
  shape: string
  shapeImport: string
  dispatchParams: string
  dispatchParamExpansion: string
} {
  const paramMandatory = isParamMandatory(properties.variables ?? []);

  if (properties.response) {
    if (properties.requestBody) {
      if (paramMandatory) {
        return {
          shape: `BinaryFunctionHook<Params, RequestBody, Response, _ErrorType>`,
          shapeImport: `BinaryFunctionHook`,
          dispatchParamExpansion: `data, p`,
          dispatchParams: "data: RequestBody, params: Params"
        }
      } else {
        return {
          shape: `BinaryFunctionHook<Params, RequestBody, Response, _ErrorType>`,
          shapeImport: `BinaryFunctionHook`,
          dispatchParamExpansion: `data, p = {}`,
          dispatchParams: "data: RequestBody, params?: Params"
        }
      }
    } else {
      if (paramMandatory) {
        return {
          shape: `UnaryFunctionHook<Params, Response, _ErrorType>`,
          shapeImport: `UnaryFunctionHook`,
          dispatchParamExpansion: `p`,
          dispatchParams: "params: Params"
        }
      } else {
        return {
          shape: `UnaryFunctionHook<Params, Response, _ErrorType>`,
          shapeImport: `UnaryFunctionHook`,
          dispatchParamExpansion: `p = {}`,
          dispatchParams: "params?: Params"
        }
      }
    }
  } else {
    if (properties.requestBody) {
      if (paramMandatory) {
        return {
          shape: `BinaryProduceHook<Params, RequestBody, _ErrorType>`,
          shapeImport: `BinaryProduceHook`,
          dispatchParamExpansion: `data, p`,
          dispatchParams: "data: RequestBody, params: Params"
        }
      } else {
        return {
          shape: `BinaryProduceHook<Params, RequestBody, _ErrorType>`,
          shapeImport: `BinaryProduceHook`,
          dispatchParamExpansion: `data, p = {}`,
          dispatchParams: "data: RequestBody, params?: Params"
        }
      }
    } else {
      if (paramMandatory) {
        return {
          shape: `UnaryProduceHook<Params, _ErrorType>`,
          shapeImport: `UnaryProduceHook`,
          dispatchParamExpansion: `p`,
          dispatchParams: "params: Params"
        }
      } else {
        return {
          shape: `UnaryProduceHook<Params, _ErrorType>`,
          shapeImport: `UnaryProduceHook`,
          dispatchParamExpansion: `p = {}`,
          dispatchParams: "params?: Params"
        }
      }
    }
  }
}

export function decodeDispatchParams(operationId: string, requestBody?: string, isParamMandatory?: boolean) {
  return {
    dispatchParams: getDispatchParams(operationId, requestBody, isParamMandatory),
    dispatchParamExpansion: getDispatchParamExpansion(requestBody, isParamMandatory)
  }
}

export function getDataTransformer(contentType?: string) {
  let finalRequestBodyBlock = 'data'
  switch (contentType) {
    case "application/json":
    case "application/octet-stream":
    case "text/plain":
      finalRequestBodyBlock = `data`
      break;
    case "multipart/form-data":
      finalRequestBodyBlock = `data: (function(){
        let formData = new FormData()
        Object.entries(data).filter(a => !!a[1]).forEach(([key, value]) => formData.append(key, value))
        return formData;
      })()`
      break;
    case "application/x-www-form-urlencoded":
      finalRequestBodyBlock = `data: qs.stringify(data)`
      break;
  }
  return finalRequestBodyBlock;
}

const contentTypePostfixMap: Record<string, string | undefined> = {
  'application/json': undefined,
  'multipart/form-data': 'form',
  'application/octet-stream': 'binary',
  'application/x-www-form-urlencoded': 'form',
  'application/xml': 'xml',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
}

export function generatePostfix(contentType: string | undefined, responseType: string | undefined) {
  return [
    contentType && contentTypePostfixMap[contentType] ? `$${contentTypePostfixMap[contentType]}` : undefined,
    responseType && contentTypePostfixMap[responseType] ? `_${contentTypePostfixMap[responseType]}` : undefined,
  ].filter(Boolean)
    .join('')
}

export function decodeErrorSections(errorResponses: Record<string, ErrorResponse>, source: string, prefix = '@root') {
  const errorTypes = Array.from(new Set(Object.values(errorResponses ?? {}).map(a => a.response)));

  const imports = errorTypes.map(ref => `import {${ref}, ${ref}Schema } from "${prefix}/${source}/components/schemas/${ref}"`)
    .join('\n');

  let schemaValidation = "z.any()"
  switch (errorTypes.length) {
    case 0:
      schemaValidation = "z.any()"
      break;
    case 1:
      schemaValidation = `${errorTypes[0]}Schema`
      break;
    default:
      schemaValidation = `z.union([${errorTypes.map(a => `${a}Schema`).join(', ')}])`
  }

  const s = errorTypes.join(' | ');
  const def = `${s.trim().length ? s : 'any'}`

  return {
    imports,
    def,
    schemaValidation,
  }
}
