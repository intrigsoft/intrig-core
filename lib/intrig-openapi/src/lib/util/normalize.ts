import {OpenAPIV3, OpenAPIV3_1} from "openapi-types";
import {produce} from 'immer'
import {pascalCase, camelCase} from '@intrig/common'
import ReferenceObject = OpenAPIV3.ReferenceObject;
import ExampleObject = OpenAPIV3_1.ExampleObject;
import {deref, isRef} from "./ref-management";

function generateTypeName(operationOb: OpenAPIV3_1.OperationObject, postFix: string) {
  return [operationOb.tags?.[0], operationOb.operationId, postFix].filter(Boolean)
    .map(s => pascalCase(s!))
    .join("$");
}

export function normalize(spec: OpenAPIV3_1.Document) {

  const doDeref = deref(spec)

  return produce(spec, draft => {
    const paths = draft.paths as OpenAPIV3_1.PathsObject;
    for (const [path, pathItem] of Object.entries(paths)) {
      const pathItemObject = pathItem as OpenAPIV3_1.PathItemObject;
      if (pathItemObject.parameters) {
        pathItemObject.parameters = pathItemObject.parameters
          .map(doDeref)
          .map(a => a as OpenAPIV3_1.ParameterObject)
      }
      for (const [method, operation] of Object.entries(pathItemObject)) {
        if (["get", "post", "put", "delete"].includes(method.toLowerCase())) {
          const operationOb = operation as OpenAPIV3_1.OperationObject;
          operationOb.tags?.forEach(tag => {
            draft.tags = draft.tags ?? []
            if (!draft.tags.some(t => t.name === tag)) {
              draft.tags.push({
                name: tag
              })
            }
          })
          if (!operationOb.operationId) {
            operationOb.operationId = camelCase(`${method.toLowerCase()}_${path.replace("/", "_")}`)
          }
          if (operationOb.parameters) {
            operationOb.parameters = operationOb.parameters.map(doDeref).map(a => a as OpenAPIV3_1.ParameterObject)
            operationOb.parameters
              .map(a => a as OpenAPIV3_1.ParameterObject)
              .forEach((param: OpenAPIV3_1.ParameterObject) => {
              if (!isRef(param.schema)) {
                const paramName = generateTypeName(operationOb, param.name)
                if (draft.components?.["schemas"]) {
                  draft.components["schemas"][paramName] = param.schema as OpenAPIV3_1.SchemaObject;
                }
                param.schema = {
                  $ref: `#/components/schemas/${paramName}`
                } satisfies OpenAPIV3_1.ReferenceObject
              }
            })
          }
          if (operationOb.requestBody) {
            let requestBody = doDeref(operationOb.requestBody) as OpenAPIV3_1.RequestBodyObject;
            operationOb.requestBody = requestBody
            Object.values(requestBody.content)
              .forEach(mto => {
                if (mto.examples) {
                  mto.examples = Object.fromEntries(Object.entries(mto.examples).map(([k, v]) => ([k, doDeref(v)])).filter(([_, v]) => v !== undefined)) as Record<string, ReferenceObject | ExampleObject>
                }
                if (!isRef(mto.schema)) {
                  const paramName = generateTypeName(operationOb,'RequestBody')
                  draft.components = draft.components ?? {};
                  draft.components.schemas = draft.components.schemas ?? {};
                  draft.components.schemas[paramName] = mto.schema as OpenAPIV3_1.SchemaObject;
                  mto.schema = {
                    $ref: `#/components/schemas/${paramName}`
                  } satisfies OpenAPIV3_1.ReferenceObject
                }
              })

          }
          if (operationOb.callbacks) {
            operationOb.callbacks = Object.fromEntries(Object.entries(operationOb.callbacks)
              .map(([k, v]) => ([k, doDeref(v)]))
              .filter(([_, v]) => v !== undefined))
          }

          if (operationOb.responses) {
            operationOb.responses = Object.fromEntries(Object.entries(operationOb.responses)
              .map(([k, v]) => ([k, doDeref(v)]))
              .filter(([_, v]) => v !== undefined))
            Object.values(operationOb.responses!)
              .filter(Boolean)
              .map(a => a as OpenAPIV3_1.ResponseObject)
              .map((response: OpenAPIV3_1.ResponseObject) => {
                if (response.headers) {
                  response.headers = doDeref(response.headers)
                }
                if (response.links) {
                  response.links = doDeref(response.links)
                }
                if (response.content) {
                  Object.values(response.content).map((mto: OpenAPIV3_1.MediaTypeObject) => {
                    if (mto.examples) {
                      mto.examples = Object.fromEntries(Object.entries(mto.examples)
                        .map(([k, v]) => ([k, doDeref(v)]))
                        .filter(([_, v]) => v !== undefined)) as Record<string, ReferenceObject | ExampleObject>
                    }

                    if (!isRef(mto.schema)) {
                      const paramName = generateTypeName(operationOb,'ResponseBody')
                      draft.components = draft.components ?? {};
                      draft.components.schemas = draft.components.schemas ?? {};
                      draft.components.schemas[paramName] = mto.schema as OpenAPIV3_1.SchemaObject;
                      mto.schema = {
                        $ref: `#/components/schemas/${paramName}`
                      } satisfies OpenAPIV3_1.ReferenceObject
                    }
                  })
                }
              })
          }
        }
      }
    }
    //TODO implement fix schema types.
  })
}