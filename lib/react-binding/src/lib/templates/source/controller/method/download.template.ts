import {
  camelCase,
  generatePostfix,
  GeneratorContext,
  pascalCase,
  ResourceDescriptor, RestData,
  typescript, Variable
} from 'common';
import * as path from 'path';
import * as mimeType from 'mime-types'

function extractHookShapeAndOptionsShape(response: string | undefined, requestBody: string | undefined, imports: Set<string>) {
  if (response) {
    if (requestBody) {
      imports.add(`import { BinaryFunctionHook, BinaryHookOptions } from "@intrig/react"`);
      return {
        hookShape: `BinaryFunctionHook<Params, RequestBody, Response, _ErrorType>`,
        optionsShape: `BinaryHookOptions<Params, RequestBody>`
      };
    } else {
      imports.add(`import { UnaryFunctionHook, UnaryHookOptions } from "@intrig/react"`);
      return {
        hookShape: `UnaryFunctionHook<Params, Response, _ErrorType>`,
        optionsShape: `UnaryHookOptions<Params>`
      };
    }
  } else {
    if (requestBody) {
      imports.add(`import { BinaryProduceHook, BinaryHookOptions } from "@intrig/react"`);
      return {
        hookShape: `BinaryProduceHook<Params, RequestBody, _ErrorType>`,
        optionsShape: `BinaryHookOptions<Params, RequestBody>`
      };
    } else {
      imports.add(`import { UnaryProduceHook, UnaryHookOptions } from "@intrig/react"`);
      return {
        hookShape: `UnaryProduceHook<Params, _ErrorType>`,
        optionsShape: `UnaryHookOptions<Params>`
      };
    }
  }
}

function extractParamDeconstruction(variables: Variable[] | undefined, requestBody: string | undefined) {
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


export async function reactDownloadHookTemplate({source,
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
  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `use${pascalCase(operationId)}${postfix}Download.ts`))

  const modifiedRequestUrl = `${requestUrl?.replace(/\{/g, "${")}`

  const imports = new Set<string>();
  imports.add(`import { z } from 'zod'`)
  imports.add(`import { useCallback, useEffect } from 'react'`)
  imports.add(`import {useNetworkState, NetworkState, DispatchState, pending, success, error, init, successfulDispatch, validationError, encode, isSuccess} from "@intrig/react"`)

  const { hookShape, optionsShape } = extractHookShapeAndOptionsShape(response, requestBody, imports);

  const { paramExpression, paramType } = extractParamDeconstruction(variables, requestBody);

  if (requestBody) {
    imports.add(`import { ${requestBody} as RequestBody, ${requestBody}Schema as requestBodySchema } from "@intrig/react/${source}/components/schemas/${requestBody}"`)
  }

  if (response) {
    imports.add(`import { ${response} as Response, ${response}Schema as schema } from "@intrig/react/${source}/components/schemas/${response}"`)
  }

  imports.add(`import {${pascalCase(operationId)}Params as Params} from './${pascalCase(operationId)}.params'`)

  const errorTypes = [...new Set(Object.values(errorResponses ?? {}).map(a => a.response))]
  errorTypes.forEach(ref => imports.add(`import {${ref}, ${ref}Schema } from "@intrig/react/${source}/components/schemas/${ref}"`))

  const paramExplode = [
    ...variables?.filter(a => a.in === "path").map(a => a.name) ?? [],
    "...params"
  ].join(",")

  const finalRequestBodyBlock = requestBody ? `,data: encode(data, "${contentType}", requestBodySchema)` : ''

  return ts`
    ${[...imports].join('\n')}

    ${!response ? `
    type Response = any;
    const schema = z.any();
    ` : ''}

    ${extractErrorParams(errorTypes.map(a => a as string))}

    const operation = "${method.toUpperCase()} ${requestUrl}| ${contentType} -> ${responseType}"
    const source = "${source}"

    function use${pascalCase(operationId)}Hook(options: ${optionsShape} = {}): [NetworkState<Response, _ErrorType>, (${paramType}) => DispatchState<any>, () => void] {
      let [state, dispatch, clear, dispatchState] = useNetworkState<Response, _ErrorType>({
        key: options?.key ?? 'default',
        operation,
        source,
        schema,
        errorSchema
      });
      
      useEffect(() => {
        if (isSuccess(state)) {
          let a = document.createElement('a');
          const ct =
            state.headers?.['content-type'] ?? 'application/octet-stream';
          let data: any = state.data;
          if (ct.startsWith('application/json')) {
          let data: any[];
          if (ct.startsWith('application/json')) {
            data = [JSON.stringify(state.data, null, 2)];
          } else {
            data = [state.data];
          }
          a.href = URL.createObjectURL(new Blob(Array.isArray(data) ? data : [data], {type: ct}));
          const contentDisposition = state.headers?.['content-disposition'];
          let filename = '${pascalCase(operationId)}.${mimeType.extension(contentType)}';
          if (contentDisposition) {
            const rx = /filename\\*=(?:UTF-8'')?([^;\\r\\n]+)|filename="?([^";\\r\\n]+)"?/i;
            const m = contentDisposition.match(rx);
            if (m && m[1]) {
              filename = decodeURIComponent(m[1].replace(/\\+/g, ' '));
            } else if (m && m[2]) {
              filename = decodeURIComponent(m[2].replace(/\\+/g, ' '));
            }
          } 
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          dispatchState(init())
        }
      }, [state])

      let doExecute = useCallback<(${paramType}) => DispatchState<any>>((${paramExpression}) => {
        let { ${paramExplode}} = p

          ${requestBody ? `
          const validationResult = requestBodySchema.safeParse(data);
          if (!validationResult.success) {
            return validationError(validationResult.error.errors);
          }
          ` : ``}

          dispatch({
            method: '${method}',
            url: \`${modifiedRequestUrl}\`,
            headers: {
              ${contentType ? `"Content-Type": "${contentType}",` : ''}
            },
            params,
            key: \`${"${source}: ${operation}"}\`,
            source: '${source}'
            ${requestBody ? finalRequestBodyBlock : ''},
            ${responseType === "text/event-stream" ? `responseType: 'stream', adapter: 'fetch',` : ''}
          })
          return successfulDispatch();
      }, [dispatch])
      
      useEffect(() => {
        if (options.fetchOnMount) {
          doExecute(${[requestBody ? `options.body!` : undefined, "options.params!"].filter(a => a).join(",")});
        }

        return () => {
          if (options.clearOnUnmount) {
            clear();
          }
        }
      }, [])

      return [
        state,
        doExecute,
        clear
      ]
    }

    use${pascalCase(operationId)}Hook.key = \`${"${source}: ${operation}"}\`

    export const use${pascalCase(operationId)}Download: ${hookShape} = use${pascalCase(operationId)}Hook;
  `
}
