import { mdLiteral, ResourceDescriptor, Schema, typescript} from "@intrig/plugin-sdk"
import {openApiSchemaToZod} from '../source/type/typeTemplate.js'
import path from "path";

/**
 * Schema documentation tab builders for React binding.
 * We keep a small, composable API similar to other docs templates.
 */

export async function schemaTypescriptDoc(result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-typescript.md')
  const name = result.data.name
  const source = result.source

  const {tsType} = openApiSchemaToZod(result.data.schema);

  const ts = typescript(path.resolve('src', source, 'temp', name, `${name}.ts`))

  const importContent = await ts`
    import type { ${name} } from '@intrig/react/${source}/components/schemas/${name}';
  `;

  const codeContent = await ts`
    export type ${name} = ${tsType};
  `

  return md`
# Typescript Type
Use this TypeScript type anywhere you need static typing for this object shape in your app code: component props, function params/returns, reducers, and local state in .ts/.tsx files.

## Import
${'```ts'}
${importContent.content}
${'```'}

## Definition
${'```ts'}
${codeContent.content}
${'```'}
  `
}

export async function schemaJsonSchemaDoc(result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-json.md')
  const name = result.data.name
  const source = result.source

  const ts = typescript(path.resolve('src', source, 'temp', name, `${name}.ts`))

  const importContent = await ts`
    import { ${name}_jsonschema } from '@intrig/react/${source}/components/schemas/${name}';
  `;

  const codeContent = await ts`
    export const ${name}_jsonschema = ${JSON.stringify(result.data.schema, null, 2) ?? "{}"};
  `

  return md`
# JSON Schema
Use this JSON Schema with tools that consume JSON Schema: UI form builders (e.g. react-jsonschema-form), validators (AJV, validators in backends), and generators.

## Import
${'```ts'}
${importContent.content}
${'```'}

## Definition
${'```ts'}
${codeContent.content}
${'```'}
  `
}

export async function schemaZodSchemaDoc(result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-zod.md')
  const name = result.data.name
  const source = result.source

  const {zodSchema} = openApiSchemaToZod(result.data.schema);

  const ts = typescript(path.resolve('src', source, 'temp', name, `${name}.ts`))

  const importContent = await ts`
    import { ${name}Schema } from '@intrig/react/${source}/components/schemas/${name}';
  `;

  const codeContent = await ts`
    export const ${name}Schema = ${zodSchema};
  `

  return md`
# Zod Schema
Use this Zod schema for runtime validation and parsing: form validation, client/server payload guards, and safe transformations before using or storing data.

## Import
${'```ts'}
${importContent.content}
${'```'}

## Definition
${'```ts'}
${codeContent.content}
${'```'}
  `
}
