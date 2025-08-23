import {IntrigGeneratorPlugin} from '@intrig/plugin-sdk'
import {generateCode} from "./code-generator.js";
import {getSchemaDocumentation} from "./get-schema-documentation.js";
import {getEndpointDocumentation} from "./get-endpoint-documentation.js";

function createPlugin(): IntrigGeneratorPlugin {
  return {
    meta() {
      return {
        name: 'intrig-binding',
        version: '0.0.1',
        compat: '^0.0.15'
      }
    },
    generate: generateCode,
    getSchemaDocumentation,
    getEndpointDocumentation
  }
}

export { createPlugin };
export default createPlugin;