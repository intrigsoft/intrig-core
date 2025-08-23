import {jsonLiteral} from "@intrig/plugin-sdk";
import * as path from "path";

export function reactSwcrcTemplate() {
  const json = jsonLiteral(path.resolve('.swcrc'))
  return json`
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": false,
      "dynamicImport": true
    },
    "target": "es2022",
    "externalHelpers": false
  },
  "module": {
    "type": "es6",
    "noInterop": false
  },
  "sourceMaps": true,  
  "exclude": ["../../node_modules"]
}
  `
}
