import {IntrigGeneratorPlugin} from '@intrig/plugin-sdk'
import {generateCode} from "./code-generator.js";
import {getSchemaDocumentation} from "./get-schema-documentation.js";
import {getEndpointDocumentation} from "./get-endpoint-documentation.js";
import {initPlugin, NextPluginOptions} from "./init-plugin.js";
import {postBuild} from "./post-build.js";
import {addSource} from "./add-source.js";
import {removeSource} from "./remove-source.js";
import type {JSONSchema7} from "json-schema";

const $generatorSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    "apiRoutesDir": {
      type: 'string',
      description: 'The directory where the API routes are stored.'
    }
  }
}


function createPlugin(): IntrigGeneratorPlugin<NextPluginOptions> {
  return {
    $generatorSchema,
    meta() {
      return {
        name: 'intrig-binding',
        version: '0.0.1',
        compat: '^0.0.15',
        generator: 'next'
      }
    },
    generate: generateCode,
    getSchemaDocumentation,
    getEndpointDocumentation,
    init: initPlugin,
    postBuild: postBuild,
    addSource: addSource,
    removeSource: removeSource
  }
}

export { createPlugin };
export default createPlugin;
