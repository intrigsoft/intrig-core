import { Injectable, Logger } from '@nestjs/common';
import { OpenAPIV3_1 } from "openapi-types";
import { deref, isRef } from "./ref-management";
import { RestData } from "common";

@Injectable()
export class ExtractRequestsService {
  private readonly logger = new Logger(ExtractRequestsService.name);

  extractRequestsFromSpec(spec: OpenAPIV3_1.Document): { restData: RestData[], skippedEndpoints: Array<{endpoint: string, reason: string}> } {
    this.logger.log('Starting extraction of requests from OpenAPI spec');
    this.logger.debug(`Spec title: ${spec.info?.title}, version: ${spec.info?.version}`);
    
    const pathCount = Object.keys(spec.paths || {}).length;
    this.logger.debug(`Processing ${pathCount} paths from OpenAPI spec`);
    const requests: RestData[] = [];
    const skippedEndpoints: Array<{endpoint: string, reason: string}> = [];

    const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

    for (const [path, pathData] of Object.entries(spec.paths!)) {
      this.logger.debug(`Processing path: ${path}`);

      // Extract path-level parameters
      const pathItem = pathData as OpenAPIV3_1.PathItemObject;
      const pathLevelParams = (pathItem.parameters ?? [])
        .map(p => deref(spec)<OpenAPIV3_1.ParameterObject>(p))
        .filter((p): p is OpenAPIV3_1.ParameterObject => !!p);

      for (const [method, methodData] of Object.entries(pathData!)) {
        // Skip non-HTTP method properties (parameters, summary, description, servers, $ref)
        if (!httpMethods.includes(method.toLowerCase())) {
          continue;
        }

        const operation = deref(spec)<any>(methodData);
        if (this.isOperationObject(operation)) {
          this.logger.debug(`Processing operation: ${method.toUpperCase()} ${path} (${operation.operationId})`);

          // Merge path-level and operation-level parameters (operation params override path params)
          const operationParams = (operation.parameters ?? [])
            .map((p: OpenAPIV3_1.ParameterObject | OpenAPIV3_1.ReferenceObject) =>
              deref(spec)<OpenAPIV3_1.ParameterObject>(p))
            .filter((p: OpenAPIV3_1.ParameterObject | null): p is OpenAPIV3_1.ParameterObject => !!p);

          const mergedParams = [...pathLevelParams];
          for (const opParam of operationParams) {
            const existingIndex = mergedParams.findIndex(p => p.name === opParam.name && p.in === opParam.in);
            if (existingIndex >= 0) {
              mergedParams[existingIndex] = opParam; // Override path-level param
            } else {
              mergedParams.push(opParam);
            }
          }

          const variables = mergedParams.map((param: OpenAPIV3_1.ParameterObject) => {
            return {
              name: param.name,
              in: param.in,
              // Use undefined for inline schemas instead of "any" to avoid reserved keyword issues
              ref: isRef(param.schema) ? param.schema.$ref : undefined
            }
          });

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
            
            // Check if response exists
            if (!response) {
              const reason = 'missing 200/201 response';
              const endpoint = `${method.toUpperCase()} ${path} (${operation.operationId})`;
              this.logger.warn(`Endpoint ${endpoint} does not generate REST data - ${reason}`);
              skippedEndpoints.push({endpoint, reason});
              continue;
            }
            
            // Check if response has content
            if (!response.content || Object.keys(response.content).length === 0) {
              const reason = 'response has no content';
              const endpoint = `${method.toUpperCase()} ${path} (${operation.operationId})`;
              this.logger.warn(`Endpoint ${endpoint} does not generate REST data - ${reason}`);
              skippedEndpoints.push({endpoint, reason});
              continue;
            }
            
            for (const [mediaType, content] of Object.entries(response?.content ?? {})) {
              const ref = content.schema as OpenAPIV3_1.ReferenceObject;

              // Check if schema reference exists
              if (!ref || !ref.$ref) {
                const reason = `missing schema reference in ${mediaType} response`;
                const endpoint = `${method.toUpperCase()} ${path} (${operation.operationId})`;
                this.logger.warn(`Endpoint ${endpoint} does not generate REST data - ${reason}`);
                skippedEndpoints.push({endpoint, reason});
                continue;
              }

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
          const reason = 'missing operationId';
          const endpoint = `${method.toUpperCase()} ${path}`;
          this.logger.warn(`Endpoint ${endpoint} does not generate REST data - ${reason}`);
          skippedEndpoints.push({endpoint, reason});
        }
      }
    }
    
    // Log summary of skipped endpoints
    if (skippedEndpoints.length > 0) {
      this.logger.warn(`Found ${skippedEndpoints.length} endpoints that do not generate REST data:`);
      skippedEndpoints.forEach(({endpoint, reason}) => {
        this.logger.warn(`  - ${endpoint}: ${reason}`);
      });
    }
    
    this.logger.log(`Completed extraction: found ${requests.length} REST endpoints from OpenAPI spec`);
    return { restData: requests, skippedEndpoints };
  }

  private isOperationObject(ob: any): ob is OpenAPIV3_1.OperationObject {
    return !!ob.operationId
  }
}