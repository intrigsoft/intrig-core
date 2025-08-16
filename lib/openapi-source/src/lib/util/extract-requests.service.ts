import { Injectable, Logger } from '@nestjs/common';
import { OpenAPIV3_1 } from "openapi-types";
import { deref, isRef } from "./ref-management";
import { RestData } from "common";

@Injectable()
export class ExtractRequestsService {
  private readonly logger = new Logger(ExtractRequestsService.name);

  extractRequestsFromSpec(spec: OpenAPIV3_1.Document): RestData[] {
    this.logger.log('Starting extraction of requests from OpenAPI spec');
    this.logger.debug(`Spec title: ${spec.info?.title}, version: ${spec.info?.version}`);
    
    const pathCount = Object.keys(spec.paths || {}).length;
    this.logger.debug(`Processing ${pathCount} paths from OpenAPI spec`);
    const requests: RestData[] = [];

    for (const [path, pathData] of Object.entries(spec.paths!)) {
      this.logger.debug(`Processing path: ${path}`);
      for (const [method, methodData] of Object.entries(pathData!)) {
        const operation = deref(spec)<any>(methodData);
        if (this.isOperationObject(operation)) {
          this.logger.debug(`Processing operation: ${method.toUpperCase()} ${path} (${operation.operationId})`);
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
            requests.push(params);
            this.logger.debug(`Created DELETE request for ${operation.operationId}`)
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

              const responseHeaders: Record<string, string> = {};
              for (const key in (response?.headers ?? {})) {
                const description = response?.headers?.[key].description;
                if (description) {
                  responseHeaders[key] = description;
                }
              }

              params = {
                ...params,
                response: ref.$ref.split("/").pop(),
                responseType: mediaType,
                responseHeaders,
                errorResponses,
                responseExamples: content.examples ? Object.fromEntries(
                    Object.entries(content.examples)
                      .map(([k, v]) => ([k, JSON.stringify(v)])))
                  : {default: JSON.stringify(content.example)},
              }

              if (method.toLowerCase() === "get") {
                requests.push(params);
                this.logger.debug(`Created GET request for ${operation.operationId} with response type ${mediaType}`)
              } else {
                const requestBody = operation.requestBody as OpenAPIV3_1.RequestBodyObject;
                if (
                  !requestBody ||
                  !requestBody.content ||
                  !Object.keys(requestBody.content).length) {
                  requests.push(params);
                  this.logger.debug(`Created ${method.toUpperCase()} request for ${operation.operationId} without request body`)
                } else {
                  Object.entries(requestBody?.content ?? {}).forEach(([contentType, content]) => {
                    const schema = content?.schema as OpenAPIV3_1.ReferenceObject;
                    requests.push({
                      ...params,
                      contentType,
                      requestBody: schema?.$ref?.split("/").pop(),
                    });
                    this.logger.debug(`Created ${method.toUpperCase()} request for ${operation.operationId} with ${contentType} body`)
                  })
                }
              }
            }
          }
        } else {
          this.logger.debug(`Skipping ${method.toUpperCase()} ${path} - missing operationId`);
        }
      }
    }
    
    this.logger.log(`Completed extraction: found ${requests.length} REST endpoints from OpenAPI spec`);
    return requests;
  }

  private isOperationObject(ob: any): ob is OpenAPIV3_1.OperationObject {
    return !!ob.operationId
  }
}