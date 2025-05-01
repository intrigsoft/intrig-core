import {OpenAPIV3_1} from "openapi-types";
import {ResourceDescriptor} from "./resource-descriptor";

export interface Schema {
  name: string;
  schema: OpenAPIV3_1.SchemaObject;
}

export function isSchemaDescriptor(descriptor: ResourceDescriptor<any>): descriptor is ResourceDescriptor<Schema> {
  return descriptor.type === 'schema';
}