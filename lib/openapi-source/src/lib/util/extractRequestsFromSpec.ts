// import {deref, IntrigSourceConfig, isRef, RequestProperties} from "@intrig/cli-common";
import {OpenAPIV3_1} from "openapi-types";
import {deref, isRef} from "./ref-management";
import {RestData} from "common";

export function extractRequestsFromSpec(spec: OpenAPIV3_1.Document) {
  const requests: RestData[] = [];

  for (const [path, pathData] of Object.entries(spec.paths!)) {
    for (const [method, methodData] of Object.entries(pathData!)) {
      const operation = deref(spec)<any>(methodData);
      if (isOperationObject(operation)) {
        const variables = operation.parameters
          ?.map(p => p as OpenAPIV3_1.ParameterObject)
          ?.map((param: OpenAPIV3_1.ParameterObject) => {
          return {
            name: param.name,
            in: param.in,
            ref: isRef(param.schema) ? param.schema.$ref : "any"
          }
        }) ?? [];

        let params: RestData = {
          paths: ([operation.tags?.[0]]?.filter(Boolean) ?? []) as string[],
          variables,
          requestUrl: path,
          operationId: operation.operationId!,
          method,
          description: operation.description,
          summary: operation.summary,
        }

        if (method.toLowerCase() === "delete") {
          requests.push(params)
        } else {
          const errorResponses = Object.fromEntries(Object.entries(operation.responses ?? {})
            .filter(([k]) => k[0] != "2")
            .flatMap(([k, v]) => {
              const [statusCode, mediaTypeOb] = Object.entries((v as OpenAPIV3_1.ResponseObject)?.content ?? {})
                .filter(([k]) => ["*/*", "application/json"].includes(k))[0] ?? [];
              if (!statusCode) {
                return []
              }
              const schema = mediaTypeOb?.schema as OpenAPIV3_1.ReferenceObject;
              return [
                [statusCode, {
                  response: schema?.$ref?.split("/")?.pop(),
                  responseType: k
                }]
              ];
            }));

          const response = operation.responses?.['200'] as OpenAPIV3_1.ResponseObject ?? operation.responses?.['201'] as OpenAPIV3_1.ResponseObject;
          for (const [mediaType, content] of Object.entries(response?.content ?? {})) {
            const ref = content.schema as OpenAPIV3_1.ReferenceObject;

            params = {
              ...params,
              response: ref.$ref.split("/").pop(),
              responseType: mediaType,
              errorResponses,
              responseExamples: content.examples ? Object.fromEntries(
                  Object.entries(content.examples)
                    .map(([k, v]) => ([k, JSON.stringify(v)])))
                : {default: JSON.stringify(content.example)},
            }

            if (method.toLowerCase() === "get") {
              requests.push(params)
            } else {
              const requestBody = operation.requestBody as OpenAPIV3_1.RequestBodyObject;
              if (
                !requestBody ||
                !requestBody.content ||
                !Object.keys(requestBody.content).length) {
                requests.push(params)
              } else {
                Object.entries(requestBody?.content ?? {}).forEach(([contentType, content]) => {
                  const schema = content?.schema as OpenAPIV3_1.ReferenceObject;
                  requests.push({
                    ...params,
                    contentType,
                    requestBody: schema?.$ref?.split("/").pop(),
                  })
                })
              }
            }
          }
        }
      }
    }
  }
  return requests;
}

function isOperationObject(ob: any): ob is OpenAPIV3_1.OperationObject {
  return !!ob.operationId
}
