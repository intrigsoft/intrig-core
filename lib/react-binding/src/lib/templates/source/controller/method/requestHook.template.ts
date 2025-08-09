import {
  camelCase,
  generatePostfix,
  GeneratorContext,
  pascalCase, ResourceDescriptor, RestData,
  typescript,
  Variable
} from 'common';
import * as path from 'path';

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

export async function reactRequestHookTemplate({source,
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
  const ts = typescript(path.resolve(_path, 'src', source, ...paths, camelCase(operationId), `use${pascalCase(operationId)}${postfix}.ts`))

  const modifiedRequestUrl = `${requestUrl?.replace(/\{/g, "${")}`

  const imports = new Set<string>();
  imports.add(`import { z } from 'zod'`)
  imports.add(`import { useCallback, useEffect } from 'react'`)
  imports.add(`import {useNetworkState, NetworkState, DispatchState, error, successfulDispatch, validationError, encode} from "@intrig/react"`)

  const { hookShape, optionsShape } = extractHookShapeAndOptionsShape(response, requestBody, imports);

  const { paramExpression, paramType } = extractParamDeconstruction(variables ?? [], requestBody);

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
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key: options?.key ?? 'default',
        operation,
        source,
        schema,
        errorSchema
      });

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

    export const use${pascalCase(operationId)}: ${hookShape} = use${pascalCase(operationId)}Hook;
  `
}
