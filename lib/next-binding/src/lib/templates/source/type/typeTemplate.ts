import { OpenAPIV3_1 } from 'openapi-types';
import { jsonLiteral, typescript } from 'common';
import * as path from 'path'

export interface TypeTemplateParams {
  sourcePath: string;
  typeName: string;
  schema: OpenAPIV3_1.SchemaObject;
  paths: string[]
}

export async function nextTypeTemplate({typeName, schema, sourcePath, paths}: TypeTemplateParams) {
  const {imports, zodSchema, tsType} = openApiSchemaToZod(schema);

  const ts = typescript(path.resolve(sourcePath, 'src', ...paths, `${typeName}.ts`));

  const simpleType = (await jsonLiteral('')`${JSON.stringify(schema)}`).content;

  return ts`
  import { z } from 'zod'

  ${[...imports].join('\n')}

  //--- Zod Schemas  ---//

  export const ${typeName}Schema = ${zodSchema}

  //--- Typescript Type  ---//

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

// Helper function to convert OpenAPI schema types to TypeScript types and Zod schemas
function openApiSchemaToZod(schema: OpenAPIV3_1.SchemaObject, imports: Set<string> = new Set()): { tsType: string; zodSchema: string; imports: Set<string> } {
  if (!schema) {
    return { tsType: 'any', zodSchema: 'z.any()', imports: new Set() };
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
      return handleNumberSchema(schema);
    case 'integer':
      return handleIntegerSchema(schema);
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

function handleRefSchema(ref: string, imports: Set<string>): { tsType: string; zodSchema: string; imports: Set<string> } {
  const refParts = ref.split('/');
  const refName = refParts[refParts.length - 1];
  imports.add(`import { ${refName}, ${refName}Schema } from './${refName}';`);
  return { tsType: refName, zodSchema: `z.lazy(() => ${refName}Schema)`, imports };
}

function handleStringSchema(schema: OpenAPIV3_1.SchemaObject): { tsType: string; zodSchema: string; imports: Set<string> } {
  if (schema.enum) {
    const enumValues = schema.enum.map(value => `'${value}'`).join(' | ');
    const zodEnum = `z.enum([${schema.enum.map(value => `'${value}'`).join(', ')}])`;
    return { tsType: enumValues, zodSchema: zodEnum , imports: new Set() };
  }

  let zodSchema = 'z.string()';
  let tsType = 'string';

  if (schema.format === 'date' && !schema.pattern) {
    tsType = 'Date';
    zodSchema = 'z.date()';
    zodSchema += `.transform((val) => {
        const parsedDate = new Date(val);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format');
        }
        return parsedDate;
    })`;
  } else if (schema.format === 'time') {
    zodSchema = 'z.string()';
    if (schema.pattern) {
      zodSchema += `.regex(new RegExp('${schema.pattern}'))`;
    }
  } else if (schema.format === 'date-time' && !schema.pattern) {
    tsType = 'Date';
    zodSchema = 'z.coerce.date()';
    zodSchema += `.transform((val) => {
        const parsedDateTime = new Date(val);
        if (isNaN(parsedDateTime.getTime())) {
          throw new Error('Invalid date-time format');
        }
        return parsedDateTime;
    })`;
  } else if (schema.format === 'binary') {
    tsType = 'Blob';
    zodSchema = 'z.instanceof(Blob)';
  } else if (schema.format === 'byte') {
    tsType = 'Buffer';
    zodSchema = 'z.string().transform((val) => Buffer.from(val, "base64"))';
  } else if (schema.format === 'email') {
    zodSchema = 'z.string().email()';
  } else if (schema.format === 'uuid') {
    zodSchema = 'z.string().uuid()';
  } else if (schema.format === 'uri') {
    zodSchema = 'z.string().url()';
  } else if (schema.format === 'hostname') {
    zodSchema = 'z.string()'; // Zod does not have a direct hostname validator
  } else if (schema.format === 'ipv4') {
    zodSchema =  'z.string().regex(/^((25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/)';
  } else if (schema.format === 'ipv6') {
    zodSchema = 'z.string().regex(/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}|:)|::(ffff(:0{1,4}){0,1}:)?((25[0-5]|(2[0-4]|1[0-9]|[0-9])\\.){3}(25[0-5]|(2[0-4]|1[0-9]|[0-9]))))$/)';
  } else {
    if (schema.minLength !== undefined) zodSchema += `.min(${schema.minLength})`;
    if (schema.maxLength !== undefined) zodSchema += `.max(${schema.maxLength})`;
    if (schema.pattern !== undefined) zodSchema += `.regex(new RegExp('${schema.pattern}'))`;
  }
  return { tsType, zodSchema, imports: new Set() };
}

function handleNumberSchema(schema: OpenAPIV3_1.SchemaObject): { tsType: string; zodSchema: string; imports: Set<string> } {
  let zodSchema = 'z.number()';
  if (schema.minimum !== undefined) zodSchema += `.min(${schema.minimum})`;
  if (schema.maximum !== undefined) zodSchema += `.max(${schema.maximum})`;
  return { tsType: 'number', zodSchema, imports: new Set() };
}

function handleIntegerSchema(schema: OpenAPIV3_1.SchemaObject): { tsType: string; zodSchema: string; imports: Set<string> } {
  let zodSchema = 'z.number().int()';
  if (schema.minimum !== undefined) zodSchema += `.min(${schema.minimum})`;
  if (schema.maximum !== undefined) zodSchema += `.max(${schema.maximum})`;
  return { tsType: 'number', zodSchema, imports: new Set() };
}

function handleBooleanSchema(): { tsType: string; zodSchema: string; imports: Set<string> } {
  const zodSchema = 'z.boolean()';
  return { tsType: 'boolean', zodSchema, imports: new Set() };
}

function handleArraySchema(schema: OpenAPIV3_1.ArraySchemaObject, imports: Set<string>): { tsType: string; zodSchema: string; imports: Set<string> } {
  if (schema.items) {
    const { tsType, zodSchema: itemZodSchema, imports: itemImports } = openApiSchemaToZod(schema.items as OpenAPIV3_1.SchemaObject, imports);
    let zodSchema = `z.preprocess((raw) => (Array.isArray(raw) ? raw : [raw]), z.array(${itemZodSchema}))`;
    if (schema.minItems !== undefined) zodSchema += `.min(${schema.minItems})`;
    if (schema.maxItems !== undefined) zodSchema += `.max(${schema.maxItems})`;
    return { tsType: `(${tsType})[]`, zodSchema, imports: new Set([...imports, ...itemImports]) };
  }
  throw new Error('Array schema must have an items property');
}

function handleObjectSchema(schema: OpenAPIV3_1.SchemaObject, imports: Set<string>): { tsType: string; zodSchema: string; imports: Set<string> } {
  const updatedRequiredFields = schema.required || [];
  if (schema.properties) {
    const propertiesTs = Object.entries(schema.properties).map(([key, value]) => {
      const { tsType } = openApiSchemaToZod(value as OpenAPIV3_1.SchemaObject);
      const isRequired = updatedRequiredFields.includes(key);
      return `${key}${isRequired ? '' : '?'}: ${tsType};`;
    });

    const propertiesZod = Object.entries(schema.properties).map(([key, value]) => {
      const { zodSchema, imports: propImports } = openApiSchemaToZod(value as OpenAPIV3_1.SchemaObject);
      imports = new Set([...imports, ...propImports]);
      const isRequired = updatedRequiredFields.includes(key);
      return `${key}: ${isRequired ? zodSchema : zodSchema.includes('.optional().nullable()') ? zodSchema : zodSchema + '.optional().nullable()'}`;
    });

    return {
      tsType: `{ ${propertiesTs.join(' ')} }`,
      zodSchema: `z.object({ ${propertiesZod.join(', ')} })`,
      imports,
    };
  }
  return { tsType: 'any', zodSchema: 'z.any()', imports: new Set() };
}

function handleComplexSchema(schema: OpenAPIV3_1.SchemaObject, imports: Set<string>): { tsType: string; zodSchema: string; imports: Set<string> } {
  if (schema.oneOf) {
    const options = schema.oneOf.map(subSchema => openApiSchemaToZod(subSchema as OpenAPIV3_1.SchemaObject));
    const zodSchemas = options.map(option => option.zodSchema);
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' | '), zodSchema: `z.union([${zodSchemas.join(', ')}])`, imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  if (schema.anyOf) {
    const options = schema.anyOf.map(subSchema => openApiSchemaToZod(subSchema as OpenAPIV3_1.SchemaObject));
    const zodSchemas = options.map(option => option.zodSchema);
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' | '), zodSchema: `z.union([${zodSchemas.join(', ')}])`, imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  if (schema.allOf) {
    const options = schema.allOf.map(subSchema => openApiSchemaToZod(subSchema as OpenAPIV3_1.SchemaObject));
    const zodSchemas = options.map(option => option.zodSchema);
    const tsTypes = options.map(option => option.tsType);
    return { tsType: tsTypes.join(' & '), zodSchema: `z.intersection(${zodSchemas.join(', ')})`, imports: new Set([...imports, ...options.flatMap(option => Array.from(option.imports))]) };
  }
  return { tsType: 'any', zodSchema: 'z.any()', imports };
}
