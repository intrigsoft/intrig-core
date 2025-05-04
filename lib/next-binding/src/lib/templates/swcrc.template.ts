import {jsonLiteral} from "common";
import * as path from "path";

export function swcrcTemplate(_path: string) {
  const json = jsonLiteral(path.resolve(_path, '.swcrc'))
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
  "sourceMaps": true
}
  `
}
