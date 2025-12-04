import {ResourceDescriptor, Schema, Tab} from "@intrig/plugin-sdk";
import {schemaJsonSchemaDoc, schemaTypescriptDoc} from "./templates/docs/schema.js";

export async function getSchemaDocumentation(result: ResourceDescriptor<Schema>): Promise<Tab[]> {
  const tabs: Tab[] = []
  tabs.push({ name: 'TypeScript Type', content: (await schemaTypescriptDoc(result)).content })
  tabs.push({ name: 'JSON Schema', content: (await schemaJsonSchemaDoc(result)).content })

  return tabs
}
