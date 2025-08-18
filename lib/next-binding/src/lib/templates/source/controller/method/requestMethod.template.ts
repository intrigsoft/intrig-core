import {
  camelCase,
  generatePostfix,
  GeneratorContext,
  pascalCase,
  ResourceDescriptor, RestData,
  typescript, Variable
} from 'common';
import path from 'path';

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


function extractErrorParams(errorTypes: (string | undefined)[]) {
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

export function nextRequestMethodTemplate(
  {
    source, data: {
    paths, operationId, response, requestUrl, variables, requestBody, contentType, responseType, errorResponses, method
  }
  }: ResourceDescriptor<RestData>, clientExports: string[] = [], serverExports: string[] = [], _path: string, ctx: GeneratorContext,
) {
  const ts = typescript(
    path.resolve(
      _path,
      'src',
      source,
      ...paths,
      camelCase(operationId),
      `${camelCase(operationId)}${generatePostfix(contentType, responseType)}.ts`,
    ),
  );

  ctx.generatorCtx?.getCounter(source)?.inc("Server Side Async Methods")

  const modifiedRequestUrl = `${requestUrl?.replace(/\{/g, '${')}`;

  serverExports.push(`export { ${camelCase(operationId)} } from './${camelCase(operationId)}${generatePostfix(contentType, responseType)}'`);

  const imports = new Set<string>();
  imports.add(`import { z, ZodError } from 'zod'`);
  imports.add(`import { isAxiosError } from 'axios';`);
  imports.add(
    `import {getAxiosInstance, addResponseToHydrate, getHeaders} from '@intrig/next/intrig-middleware'`,
  );
  imports.add(
    `import {transformResponse, encode} from '@intrig/next/media-type-utils'`,
  );
  imports.add(
    `import { networkError, responseValidationError, AsyncRequestOptions } from '@intrig/next';`,
  );
  imports.add(`import logger from "@intrig/next/logger"`);

  const { paramExpression, paramType } = extractParamDeconstruction(
    variables,
    requestBody,
  );

  if (requestBody) {
    imports.add(
      `import { ${requestBody} as RequestBody, ${requestBody}Schema as requestBodySchema } from "@intrig/next/${source}/components/schemas/${requestBody}"`,
    );
    serverExports.push(`export { ${requestBody} } from "@intrig/next/${source}/components/schemas/${requestBody}"`);
  }

  if (response) {
    imports.add(
      `import { ${response} as Response, ${response}Schema as schema } from "@intrig/next/${source}/components/schemas/${response}"`,
    );
    serverExports.push(`export { ${response} } from "@intrig/next/${source}/components/schemas/${response}"`);
  }

  imports.add(
    `import {${pascalCase(operationId)}Params as Params} from './${pascalCase(operationId)}.params'`,
  );

  const errorTypes = [
    ...new Set(Object.values(errorResponses ?? {}).map((a) => a.response)),
  ];
  errorTypes.forEach((ref) =>
    imports.add(
      `import {${ref}, ${ref}Schema } from "@intrig/next/${source}/components/schemas/${ref}"`,
    ),
  );

  const paramExplode = [
    ...(variables?.filter((a) => a.in === 'path').map((a) => a.name) ?? []),
    '...params',
  ].join(',');

  const finalRequestBodyBlock = requestBody
    ? `data: encode(data, "${contentType}", requestBodySchema)`
    : '';

  const responseTypeBlock =
    responseType &&
    (responseType.startsWith('application/vnd') ||
      responseType === 'application/octet-stream')
      ? `responseType: 'arraybuffer'`
      : undefined;

  return ts`
    ${[...imports].join('\n')}

    ${
      !response
        ? `
    type Response = any;
    const schema = z.any();
    `
        : ''
    }

    ${extractErrorParams(errorTypes)}

    const operation = "${method.toUpperCase()} ${requestUrl}| ${contentType} -> ${responseType}"

    export const execute${pascalCase(operationId)}: (${paramType}, options?: AsyncRequestOptions) => Promise<{data: any, headers: any}> = async (${paramExpression}, options) => {
          ${requestBody ? `requestBodySchema.parse(data);` : ''}
          let {${paramExplode}} = p

          logger.info("Executing request ${source}: ${method} ${modifiedRequestUrl}");
          logger.debug("⇨", {p, ${requestBody ? 'data' : ''}})

          let _headers = await getHeaders() ?? {};

          let axiosInstance = await getAxiosInstance('${source}')
          let { data: responseData, headers } = await axiosInstance.request({
            method: '${method}',
            url: \`${modifiedRequestUrl}\`,
            headers: {
              ..._headers,
              ${contentType ? `"Content-Type": "${contentType}",` : ''}
            },
            params,
            ${[requestBody && finalRequestBodyBlock, responseTypeBlock]
              .filter(Boolean)
              .join(',\n')}
          })

          logger.info("Executed request completed ${source}: ${method} ${modifiedRequestUrl}");
          logger.debug("⇦", {responseData, headers})

          if (options?.hydrate) {
            await addResponseToHydrate(\`${source}:\${operation}:\${options?.key ?? "default"}\`, responseData);
          }

          return {
            data: responseData,
            headers
          }
    }

    export const ${camelCase(operationId)}: (${paramType}, options?: AsyncRequestOptions) => Promise<Response> = async (${paramExpression}, options) => {
      try {
        let { data: responseData, headers } = await execute${pascalCase(operationId)}(${requestBody ? 'data,' : ''} p, options);
        return transformResponse(responseData, "${responseType}", schema);
      } catch (e: any) {
        if (isAxiosError(e) && e.response) {
          logger.error("Error executing request", e.response.data)
          throw networkError(transformResponse(e.response.data, "application/json", errorSchema), e.response.status + "", e.response.request);
        } else if (e instanceof ZodError) {
          logger.error("Response validation error", e)
          throw responseValidationError(e)
        }
        logger.error("Unknown error", e)
        throw e;
      }
    }

    export type ${pascalCase(operationId)}Params = Params;
    ${response ? `export type ${pascalCase(operationId)}Response = Response;` : ''}
    ${requestBody ? `export type ${pascalCase(operationId)}RequestBody = RequestBody;` : ''}
  `;
}
