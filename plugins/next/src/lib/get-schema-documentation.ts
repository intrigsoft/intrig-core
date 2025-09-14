import {ResourceDescriptor, Schema, Tab} from "@intrig/plugin-sdk";
import {schemaJsonSchemaDoc, schemaTypescriptDoc, schemaZodSchemaDoc} from "./templates/docs/schema.js";

export async function getSchemaDocumentation(result: ResourceDescriptor<Schema>): Promise<Tab[]> {
  const tabs: Tab[] = []
  tabs.push({ name: 'Typescript Type', content: (await schemaTypescriptDoc(result)).content })
  tabs.push({ name: 'JSON Schema', content: (await schemaJsonSchemaDoc(result)).content })
  tabs.push({ name: 'Zod Schema', content: (await schemaZodSchemaDoc(result)).content })

  return tabs
}