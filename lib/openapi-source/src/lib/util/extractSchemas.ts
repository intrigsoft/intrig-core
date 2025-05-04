import {OpenAPIV3_1} from "openapi-types";
import {Schema} from "common";

export function extractSchemas(spec: OpenAPIV3_1.Document): Schema[] {
  return Object.entries(spec.components?.schemas ?? {}).map(([name, schema]) => ({
    name,
    schema
  }));
}
