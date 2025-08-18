import { mdLiteral, ResourceDescriptor, Schema } from 'common'

/**
 * Schema documentation tab builders for Next binding.
 * Mirrors react-binding docs but with @intrig/next import paths.
 */

export async function schemaTypescriptDoc(code: string, result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-typescript.md')
  const name = result.data.name
  const source = result.source
  return md`
# Typescript Type
Use this TypeScript type anywhere you need static typing for this object shape in your app code: component props, function params/returns, reducers, and local state in .ts/.tsx files.

## Import
${'```ts'}
import type { ${name} } from '@intrig/next/${source}/components/schemas/${name}';
${'```'}

## Definition
${'```ts'}
${(code ?? '').trim()}
${'```'}
  `
}

export async function schemaJsonSchemaDoc(code: string, result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-json.md')
  const name = result.data.name
  const source = result.source
  return md`
# JSON Schema
Use this JSON Schema with tools that consume JSON Schema: UI form builders (e.g. react-jsonschema-form), validators (AJV, validators in backends), and generators.

## Import
${'```ts'}
import { ${name}_jsonschema } from '@intrig/next/${source}/components/schemas/${name}';
${'```'}

## Definition
${'```ts'}
${(code ?? '').trim()}
${'```'}
  `
}

export async function schemaZodSchemaDoc(code: string, result: ResourceDescriptor<Schema>) {
  const md = mdLiteral('schema-zod.md')
  const name = result.data.name
  const source = result.source
  return md`
# Zod Schema
Use this Zod schema for runtime validation and parsing: form validation, client/server payload guards, and safe transformations before using or storing data.

## Import
${'```ts'}
import { ${name}Schema } from '@intrig/next/${source}/components/schemas/${name}';
${'```'}

## Definition
${'```ts'}
${(code ?? '').trim()}
${'```'}
  `
}

// Reserved for potential future tab
export async function schemaSimpleTypeDoc(code: string) {
  const md = mdLiteral('schema-simple.md')
  return md`
# Simple Type

${'```ts'}
${(code ?? '').trim()}
${'```'}
  `
}
