import {jsonLiteral, ResourceDescriptor, Schema, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'
import { openApiSchemaToZod, SchemaConversionResult } from './schemaConverter';

// Re-export for backward compatibility
export { openApiSchemaToZod };
export type { SchemaConversionResult };

export async function typeTemplate(descriptor: ResourceDescriptor<Schema>) {

  const {
    data: {
      schema,
      name: typeName
    },
    source
  } = descriptor;

  const {imports, zodSchema, tsType} = openApiSchemaToZod(schema);

  const ts = typescript(path.resolve('src', source, 'components', 'schemas', `${typeName}.ts`));

  const simpleType = (await jsonLiteral('')`${JSON.stringify(schema)}`).content;

  const transport =
    schema.type === 'string' && (schema as any).format === 'binary'
      ? 'binary'
      : 'json';

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

  // Transport hint for clients ("binary" => use arraybuffer/blob)
  export const ${typeName}_transport = '${transport}' as const;
  `
}
