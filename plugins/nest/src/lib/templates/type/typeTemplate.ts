import { OpenAPIV3_1 } from 'openapi-types';
import {jsonLiteral, ResourceDescriptor, Schema, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export interface SchemaConversionResult {
  tsType: string;
  imports: Set<string>;
  optional?: boolean;
}

export async function typeTemplate(descriptor: ResourceDescriptor<Schema>) {

  const {
    data: {
      schema,
      name: typeName
    },
    source
  } = descriptor;

  const {imports, tsType} = openApiSchemaToTypeScript(schema);

  const ts = typescript(path.resolve('src', 'components', 'schemas', `${typeName}.ts`));

  const simpleType = (await jsonLiteral('')`${JSON.stringify(schema)}`).content;

  return ts`
${[...imports].join('\n')}

//--- TypeScript Type  ---//

export type ${typeName} = ${tsType}

//--- JSON Schema  ---//

export const ${typeName}_jsonschema = ${JSON.stringify(schema) ?? "{}"}

//--- Simple Type  ---//
/*[${simpleType}]*/
  `
}

function isRef(schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): schema is OpenAPIV3_1.ReferenceObject {
  return  '$ref' in (schema ?? {});
}

// Helper function to convert OpenAPI schema types to TypeScript types
export function openApiSchemaToTypeScript(schema: OpenAPIV3_1.SchemaObject, imports: Set<string> = new Set()): SchemaConversionResult {
  if (!schema) {
    return { tsType: 'any', imports: new Set() };
  }
  if (isRef(schema)) {
    return handleRefSchema(schema.$ref, imports);
  }

  if (!schema.type) {
    if ('properties' in schema) {
      schema.type = 'object';
    } else if ('items' in schema) {
      schema.type = 'array' as any;
    }
  }

  switch (schema.type) {
    case 'string':
      return handleStringSchema(schema);
    case 'number':
      return handleNumberSchema();
    case 'integer':
      return handleIntegerSchema();
    case 'boolean':
      return handleBooleanSchema();
    case 'array':
      return handleArraySchema(schema, imports);
    case 'object':
      return handleObjectSchema(schema, imports);
    default:
      return handleComplexSchema(schema, imports);
  }
}

function handleRefSchema(ref: string, imports: Set<string>): SchemaConversionResult {
  const refParts = ref.split('/');
  const refName = refParts[refParts.length - 1];
  imports.add(`import { ${refName} } from './${refName}';`);
  return { tsType: refName, imports };
}

function handleStringSchema(schema: OpenAPIV3_1.SchemaObject): SchemaConversionResult {
  if (schema.enum) {
    const enumValues = schema.enum.map(value => `'${value}'`).join(' | ');
    return { tsType: enumValues, imports: new Set() };
  }

  let tsType = 'string';

  if (schema.format === 'date' || schema.format === 'date-time') {
    tsType = 'Date';
  } else if (schema.format === 'binary') {
    tsType = 'Buffer';
  } else if (schema.format === 'byte') {
    tsType = 'string'; // base64 encoded string
  }

  return { tsType, imports: new Set() };
}

function handleNumberSchema(): SchemaConversionResult {
  return { tsType: 'number', imports: new Set() };
}

function handleIntegerSchema(): SchemaConversionResult {
  return { tsType: 'number', imports: new Set() };
}

function handleBooleanSchema(): SchemaConversionResult {
  return { tsType: 'boolean', imports: new Set() };
}

function handleArraySchema(schema: OpenAPIV3_1.ArraySchemaObject, imports: Set<string>): SchemaConversionResult {
  if (!schema.items) {
    throw new Error('Array schema must have an items property');
  }

  const {
    tsType,
    imports: itemImports
  } = openApiSchemaToTypeScript(schema.items as OpenAPIV3_1.SchemaObject, imports);

  return {tsType: `(${tsType})[]`, imports: new Set([...imports, ...itemImports])};
}

function handleObjectSchema(schema: OpenAPIV3_1.SchemaObject, imports: Set<string>): SchemaConversionResult {
  const updatedRequiredFields = schema.required || [];
  if (schema.properties) {
    const propertiesTs = Object.entries(schema.properties).map(([key, value]) => {
      const { tsType, optional } = openApiSchemaToTypeScript(value as OpenAPIV3_1.SchemaObject);
      const isRequired = !optional && updatedRequiredFields.includes(key);
      return `${key}${isRequired ? '' : '?'}: ${tsType} ${isRequired ? '' : ' | null'};`;
    });

    return {
      tsType: `{ ${propertiesTs.join(' ')} }`,
      imports,
    };
  }
  return { tsType: 'any', imports: new Set(), optional: true };
}

function handleComplexSchema(schema: OpenAPIV3_1.SchemaObject, imports: Set<string>): SchemaConversionResult {
  if (schema.oneOf) {
    const options = schema.oneOf.map(subSchema => openApiSchemaToTypeScript(subSchema as OpenAPIV3_1.SchemaObject));
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' | '), imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  if (schema.anyOf) {
    const options = schema.anyOf.map(subSchema => openApiSchemaToTypeScript(subSchema as OpenAPIV3_1.SchemaObject));
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' | '), imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  if (schema.allOf) {
    const options = schema.allOf.map(subSchema => openApiSchemaToTypeScript(subSchema as OpenAPIV3_1.SchemaObject));
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' & '), imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  return { tsType: 'any', imports };
}
