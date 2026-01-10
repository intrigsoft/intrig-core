import {OpenAPIV3, OpenAPIV3_1} from "openapi-types";
import {produce} from 'immer';
import {pascalCase, camelCase} from 'common';
import ReferenceObject = OpenAPIV3.ReferenceObject;
import ExampleObject = OpenAPIV3_1.ExampleObject;
import {deref, isRef} from "./ref-management";
import {createHash} from 'node:crypto';

// HTTP methods to process during normalization
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

// Pipeline types
type NormalizationStep = (spec: OpenAPIV3_1.Document) => OpenAPIV3_1.Document;

type PipelineContext = {
  spec: OpenAPIV3_1.Document;
  doDeref: <T>(obj: T | ReferenceObject) => T | undefined;
};

// Utility to generate type names
function generateTypeName(operationOb: OpenAPIV3_1.OperationObject, postFix: string) {
  return [operationOb.tags?.[0], operationOb.operationId, postFix]
    .filter(Boolean)
    .map(s => pascalCase(s!))
    .join("$");
}


// Step 1: Dereference path-level parameters
function dereferencePathParameters(spec: OpenAPIV3_1.Document) {
  const doDeref = deref(spec);

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      if (pathItemObject.parameters) {
        pathItemObject.parameters = pathItemObject.parameters
          .map(doDeref)
          .map(a => a as OpenAPIV3_1.ParameterObject);
      }
    }
  });
}


// Step 2: Ensure all tags are registered
function registerTags(spec: OpenAPIV3_1.Document) {
  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;
          operationOb.tags?.forEach(tag => {
            draft.tags = draft.tags ?? [];
            if (!draft.tags.some(t => t.name === tag)) {
              draft.tags.push({name: tag});
            }
          });
        }
      }
    }
  });
}

// Step 3: Generate missing operation IDs
function generateOperationIds(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const [path, pathItem] of Object.entries(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;
          if (!operationOb.operationId) {
            operationOb.operationId = camelCase(`${method.toLowerCase()}_${path.replace("/", "_")}`);
          }
        }
      }
    }
  });
}

// Step 4: Normalize operation parameters
function normalizeParameters(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  const doDeref = deref(spec);

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;

          if (operationOb.parameters) {
            operationOb.parameters = operationOb.parameters
              .map(doDeref)
              .map(a => a as OpenAPIV3_1.ParameterObject);

            operationOb.parameters.forEach((param: OpenAPIV3_1.ParameterObject) => {
              if (!isRef(param.schema)) {
                const paramName = generateTypeName(operationOb, param.name);
                draft.components = draft.components ?? {};
                draft.components.schemas = draft.components.schemas ?? {};
                draft.components.schemas[paramName] = param.schema as OpenAPIV3_1.SchemaObject;
                param.schema = {
                  $ref: `#/components/schemas/${paramName}`
                } satisfies OpenAPIV3_1.ReferenceObject;
              }
            });
          }
        }
      }
    }
  });
}

// Step 5: Normalize request bodies
function normalizeRequestBodies(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  const doDeref = deref(spec);

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;

          if (operationOb.requestBody) {
            const requestBody = doDeref(operationOb.requestBody) as OpenAPIV3_1.RequestBodyObject;
            operationOb.requestBody = requestBody;

            Object.values(requestBody.content).forEach(mto => {
              if (mto.examples) {
                mto.examples = Object.fromEntries(
                  Object.entries(mto.examples)
                    .map(([k, v]) => ([k, doDeref(v)]))
                    .filter(([_, v]) => v !== undefined)
                ) as Record<string, ReferenceObject | ExampleObject>;
              }

              if (!isRef(mto.schema)) {
                const paramName = generateTypeName(operationOb, 'RequestBody');
                draft.components = draft.components ?? {};
                draft.components.schemas = draft.components.schemas ?? {};
                draft.components.schemas[paramName] = mto.schema as OpenAPIV3_1.SchemaObject;
                mto.schema = {
                  $ref: `#/components/schemas/${paramName}`
                } satisfies OpenAPIV3_1.ReferenceObject;
              }
            });
          }
        }
      }
    }
  });
}

// Step 6: Normalize callbacks
function normalizeCallbacks(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  const doDeref = deref(spec);

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;

          if (operationOb.callbacks) {
            operationOb.callbacks = Object.fromEntries(
              Object.entries(operationOb.callbacks)
                .map(([k, v]) => ([k, doDeref(v)]))
                .filter(([_, v]) => v !== undefined)
            );
          }
        }
      }
    }
  });
}

// Step 7: Normalize responses
function normalizeResponses(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  const doDeref = deref(spec);

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const pathItem of Object.values(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (HTTP_METHODS.includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;

          if (operationOb.responses) {
            operationOb.responses = Object.fromEntries(
              Object.entries(operationOb.responses)
                .map(([k, v]) => ([k, doDeref(v)]))
                .filter(([_, v]) => v !== undefined)
            );

            Object.entries(operationOb.responses!)
              .filter(([_, v]) => Boolean(v))
              .forEach(([statusCode, response]) => {
                const responseObj = response as OpenAPIV3_1.ResponseObject;
                if (responseObj.headers) {
                  responseObj.headers = doDeref(responseObj.headers);
                }
                if (responseObj.links) {
                  responseObj.links = doDeref(responseObj.links);
                }
                if (responseObj.content) {
                  Object.values(responseObj.content).forEach((mto: OpenAPIV3_1.MediaTypeObject) => {
                    if (mto.examples) {
                      mto.examples = Object.fromEntries(
                        Object.entries(mto.examples)
                          .map(([k, v]) => ([k, doDeref(v)]))
                          .filter(([_, v]) => v !== undefined)
                      ) as Record<string, ReferenceObject | ExampleObject>;
                    }

                    if (!isRef(mto.schema)) {
                      // Include status code in name to differentiate responses
                      const postfix = statusCode.startsWith('2') ? 'ResponseBody' : `ResponseBody${statusCode}`;
                      const paramName = generateTypeName(operationOb, postfix);
                      draft.components = draft.components ?? {};
                      draft.components.schemas = draft.components.schemas ?? {};
                      draft.components.schemas[paramName] = mto.schema as OpenAPIV3_1.SchemaObject;
                      mto.schema = {
                        $ref: `#/components/schemas/${paramName}`
                      } satisfies OpenAPIV3_1.ReferenceObject;
                    }
                  });
                }
              });
          }
        }
      }
    }
  });
}

// Step 8: Add hash to spec
function addSpecHash(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  return produce(spec, draft => {
    (draft.info as any)['x-intrig-hash'] = createHash('sha256')
      .update(JSON.stringify(draft))
      .digest('hex');
  });
}

// Pipeline builder
class NormalizationPipeline {
  private steps: NormalizationStep[] = [];

  addStep(step: NormalizationStep): this {
    this.steps.push(step);
    return this;
  }

  addSteps(...steps: NormalizationStep[]): this {
    this.steps.push(...steps);
    return this;
  }

  execute(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
    return this.steps.reduce((currentSpec, step) => step(currentSpec), spec);
  }
}


// Default pipeline
export function createDefaultPipeline() {
  return new NormalizationPipeline()
    .addSteps(
      dereferencePathParameters,
      registerTags,
      generateOperationIds,
      normalizeParameters,
      normalizeRequestBodies,
      normalizeCallbacks,
      normalizeResponses,
      addSpecHash
    );
}

// Main normalize function (backward compatible)
export function normalize(spec: OpenAPIV3_1.Document, customStep?: NormalizationStep): OpenAPIV3_1.Document {
  const pipeline = createDefaultPipeline();
  if (typeof customStep === 'function') {
    pipeline.addStep(customStep);
  }
  return pipeline.execute(spec);
}

// Export for extensibility
export {
  NormalizationPipeline,
  dereferencePathParameters,
  registerTags,
  generateOperationIds,
  normalizeParameters,
  normalizeRequestBodies,
  normalizeCallbacks,
  normalizeResponses,
  addSpecHash
};

// Export types
export type { NormalizationStep };