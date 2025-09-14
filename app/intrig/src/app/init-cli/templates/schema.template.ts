import { jsonLiteral, IntrigGeneratorPlugin } from "@intrig/plugin-sdk";
import * as path from "path";

export function schemaTemplate(pluginInstance?: IntrigGeneratorPlugin<any>) {
  const json = jsonLiteral(path.resolve('.intrig', 'schema.json'));
  
  return json`
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "$schema": "./.intrig/schema.json",
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "specUrl": { "type": "string", "format": "uri" }
        },
        "required": ["id", "name", "specUrl"],
        "additionalProperties": false
      },
      "minItems": 1
    },
    "generator": {
      "type": "string"
    },
    "codeAnalyzer": {
      "type": "object",
      "properties": {
        "tsConfigPath": { "type": "string" }
      },
      "required": ["tsConfigPath"],
      "additionalProperties": false
    },
    "generatorOptions": ${pluginInstance && pluginInstance.$generatorSchema ? JSON.stringify(pluginInstance.$generatorSchema, null, 6) : '{ "type": "object" }'}
  },
  "required": ["sources", "generator"],
  "additionalProperties": false
}
  `;
}