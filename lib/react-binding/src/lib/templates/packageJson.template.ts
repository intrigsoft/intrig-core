import {jsonLiteral} from "common";
import * as path from "path";

export function packageJsonTemplate(_path: string) {
  const json = jsonLiteral(path.resolve(_path, 'package.json'))
  return json`
{
  "name": "@intrig/generated",
  "version": "d${Date.now()}",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "date-fns": "^4.1.0",
    "eventsource-parser": "^3.0.2",
    "fast-xml-parser": "^4.5.0",
    "immer": "^10.1.1",
    "loglevel": "1.8.1",
    "module-alias": "^2.2.2",
    "zod": "^3.23.8"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "_moduleAliases": {
    "@intrig/react": "./src"
  },
  "type": "module",
  "exports": {
    "./*": "./src/*"
  }
}
  `
}
