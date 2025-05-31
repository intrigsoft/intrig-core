import type {OpenAPIV3_1} from "openapi-types";
import {ResourceDescriptor} from "./resource-descriptor";
import {ApiProperty} from "@nestjs/swagger";
import {RelatedType, Tab} from "./common";

export interface Schema {
  name: string;
  schema: OpenAPIV3_1.SchemaObject;
}

export function isSchemaDescriptor(descriptor: ResourceDescriptor<any>): descriptor is ResourceDescriptor<Schema> {
  return descriptor.type === 'schema';
}

export class RelatedEndpoint {
  @ApiProperty({description: 'Identifier of the related endpoint'})
  id: string;

  @ApiProperty({description: 'Name of the related endpoint'})
  name: string;

  @ApiProperty({description: 'HTTP method of the endpoint'})
  method: string;

  @ApiProperty({description: 'Path of the endpoint'})
  path: string;

  constructor(id: string, name: string, method: string, path: string) {
    this.id = id;
    this.name = name;
    this.method = method;
    this.path = path;
  }

  static from(endpoint: RelatedEndpoint) {
    return new RelatedEndpoint(endpoint.id, endpoint.name, endpoint.method, endpoint.path);
  }
}

export class SchemaDocumentation {
  @ApiProperty({description: 'Unique identifier of the schema documentation'})
  id: string;

  @ApiProperty({description: 'Name of the schema'})
  name: string;

  @ApiProperty({description: 'Description of the schema'})
  description: string;

  @ApiProperty({description: 'JSON Schema object'})
  jsonSchema: OpenAPIV3_1.SchemaObject;

  @ApiProperty({description: 'List of tabs', type: [Tab]})
  tabs: Tab[];

  @ApiProperty({description: 'List of related types', type: [RelatedType]})
  relatedTypes: RelatedType[];

  @ApiProperty({description: 'List of related endpoints', type: [RelatedEndpoint]})
  relatedEndpoints: RelatedEndpoint[];

  constructor(id: string, name: string, description: string, jsonSchema: OpenAPIV3_1.SchemaObject, tabs: Tab[], relatedTypes: RelatedType[], relatedEndpoints: RelatedEndpoint[]) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.jsonSchema = jsonSchema;
    this.tabs = tabs;
    this.relatedTypes = relatedTypes;
    this.relatedEndpoints = relatedEndpoints;
  }

  static from(schema: SchemaDocumentation) {
    return new SchemaDocumentation(schema.id, schema.name, schema.description, schema.jsonSchema, schema.tabs, schema.relatedTypes, schema.relatedEndpoints);
  }
}