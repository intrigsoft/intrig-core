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
    "build": "swc src -d dist --copy-files && tsc --noEmit"
  },
  "dependencies": {
    "module-alias": "^2.2.2",
    "axios": "^1.7.7",
    "immer": "^10.1.1",
    "zod": "^3.23.8",
    "fast-xml-parser": "^4.5.0",
    "date-fns": "^4.1.0",
    "loglevel": "1.8.1"
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
