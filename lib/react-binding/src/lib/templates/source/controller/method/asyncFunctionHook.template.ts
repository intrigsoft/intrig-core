import {
  camelCase,
  generatePostfix,
  GeneratorContext,
  pascalCase, ResourceDescriptor, RestData,
  typescript,
  Variable
} from 'common';
import * as path from 'path';

function extractAsyncHookShape(response: string | undefined, requestBody: string | undefined, imports: Set<string>) {
  if (response) {
    if (requestBody) {
      imports.add(`import { BinaryFunctionAsyncHook } from "@intrig/react"`);
      return `BinaryFunctionAsyncHook<Params, RequestBody, Response, _ErrorType>`;
    } else {
      imports.add(`import { UnaryFunctionAsyncHook } from "@intrig/react"`);
      return `UnaryFunctionAsyncHook<Params, Response, _ErrorType>`;
    }
  } else {
    if (requestBody) {
      imports.add(`import { BinaryProduceAsyncHook } from "@intrig/react"`);
      return `BinaryProduceAsyncHook<Params, RequestBody, _ErrorType>`;
    } else {
      imports.add(`import { UnaryProduceAsyncHook } from "@intrig/react"`);
      return `UnaryProduceAsyncHook<Params, _ErrorType>`;
    }
  }
}

function extractErrorParams(errorTypes: string[]) {
  switch (errorTypes.length) {
    case 0:
      return `
      export type _ErrorType = any
      const errorSchema = z.any()`
    case 1:
      return `
      export type _ErrorType = ${errorTypes[0]}
      const errorSchema = ${errorTypes[0]}Schema`
    default:
      return `
      export type _ErrorType = ${errorTypes.join(' | ')}
      const errorSchema = z.union([${errorTypes.map(a => `${a}Schema`).join(', ')}])`
  }
}

function extractParamDeconstruction(variables: Variable[], requestBody?: string) {
  const isParamMandatory = variables?.some(a => a.in === 'path') || false;

  if (requestBody) {
    if (isParamMandatory) {
      return {
        paramExpression: 'data, p',
        paramType: 'data: RequestBody, params: Params'
      }
    } else {
      return {
        paramExpression: 'data, p = {}',
        paramType: 'data: RequestBody, params?: Params'
      }
    }
  } else {
    if (isParamMandatory) {
      return {
        paramExpression: 'p',
        paramType: 'params: Params'
      }
    } else {
      return {
        paramExpression: 'p = {}',
        paramType: 'params?: Params'
      }
    }
  }
}


export async function reactAsyncFunctionHookTemplate(
  {source,
    data: {
      paths,
      operationId,
      response,
      requestUrl,
      variables,
      requestBody,
      contentType,
      responseType,
      errorResponses,
      method
    }
  }: ResourceDescriptor<RestData>, _path: string, ctx: GeneratorContext) {
  const postfix = ctx.potentiallyConflictingDescriptors.includes(operationId) ? generatePostfix(contentType, responseType) : ''
  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `use${pascalCase(operationId)}Async${postfix}.ts`));

  const modifiedRequestUrl = `${requestUrl?.replace(/\{/g, "${")}`;
  const imports = new Set<string>();

  // Basic imports
  imports.add(`import { z } from 'zod'`);
  imports.add(`import { useCallback } from 'react'`);
  imports.add(`import { useTransientCall, encode, isError, isSuccess } from '@intrig/react'`);

  // Hook signature type
  const hookShape = extractAsyncHookShape(response, requestBody, imports);

  // Add body/response param imports
  if (requestBody) {
    imports.add(`import { ${requestBody} as RequestBody, ${requestBody}Schema as requestBodySchema } from "@intrig/react/${source}/components/schemas/${requestBody}"`);
  }

  if (response) {
    imports.add(`import { ${response} as Response, ${response}Schema as schema } from "@intrig/react/${source}/components/schemas/${response}"`);
  }

  imports.add(`import { ${pascalCase(operationId)}Params as Params } from './${pascalCase(operationId)}.params'`);

  // Error types
  const errorTypes = [...new Set(Object.values(errorResponses ?? {}).map((a) => a.response))];
  errorTypes.forEach((ref) => imports.add(`import { ${ref}, ${ref}Schema } from "@intrig/react/${source}/components/schemas/${ref}"`));

  // Error schema block
  const errorSchemaBlock = extractErrorParams(errorTypes.map((a) => a as string));

  // Param deconstruction
  const { paramExpression, paramType } = extractParamDeconstruction(variables ?? [], requestBody);

  const paramExplode = [
    ...(variables?.filter((a) => a.in === 'path').map((a) => a.name) ?? []),
    '...params',
  ].join(',');

  const finalRequestBodyBlock = requestBody ? `, data: encode(data, "${contentType}", requestBodySchema)` : '';

  function responseTypePart() {
    switch (responseType) {
      case "application/octet-stream":
        return `responseType: 'blob', adapter: 'fetch',`;
      case "text/event-stream":
        return `responseType: 'stream', adapter: 'fetch',`;
    }
    return ''
  }

  return ts`
${[...imports].join('\n')}

${!response ? `
type Response = any;
const schema = z.any();
` : ''}

${errorSchemaBlock}

const operation = "${method.toUpperCase()} ${requestUrl}| ${contentType} -> ${responseType}";
const source = "${source}";

function use${pascalCase(operationId)}AsyncHook(): [(${paramType}) => Promise<Response>, () => void] {
  const [call, abort] = useTransientCall<Response, _ErrorType>({
    schema,
    errorSchema
  });

  const doExecute = useCallback<(${paramType}) => Promise<Response>>(async (${paramExpression}) => {
    let { ${paramExplode} } = p;

    ${requestBody ? `
    const validationResult = requestBodySchema.safeParse(data);
    if (!validationResult.success) {
      return Promise.reject(validationResult.error);
    }
    ` : ''}

    return await call({
      method: '${method}',
      url: \`${modifiedRequestUrl}\`,
      headers: {
        ${contentType ? `"Content-Type": "${contentType}",` : ''}
      },
      params,
      key: \`${"${source}: ${operation}"}\`,
      source: '${source}'
      ${requestBody ? finalRequestBodyBlock : ''},
      ${(responseTypePart())}
    });
  }, [call]);

  return [doExecute, abort];
}

use${pascalCase(operationId)}AsyncHook.key = \`${"${source}: ${operation}"}\`;

export const use${pascalCase(operationId)}Async: ${hookShape} = use${pascalCase(operationId)}AsyncHook;
  `;
}
