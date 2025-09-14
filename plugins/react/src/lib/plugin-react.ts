import {IntrigGeneratorPlugin} from '@intrig/plugin-sdk'
import {generateCode} from "./code-generator.js";
import {getSchemaDocumentation} from "./get-schema-documentation.js";
import {getEndpointDocumentation} from "./get-endpoint-documentation.js";
import {initPlugin, ReactPluginOptions} from "./init-plugin.js";

function createPlugin(): IntrigGeneratorPlugin<ReactPluginOptions> {
  return {
    meta() {
      return {
        name: 'intrig-binding',
        version: '0.0.1',
        compat: '^0.0.15',
        generator: 'react'
      }
    },
    generate: generateCode,
    getSchemaDocumentation,
    getEndpointDocumentation,
    init: initPlugin
  }
}

export { createPlugin };
export default createPlugin;