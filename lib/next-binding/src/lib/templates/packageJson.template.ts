import {jsonLiteral} from "common";
import * as path from "path";

export function nextPackageJsonTemplate(_path: string) {
  const json = jsonLiteral(path.resolve(_path, 'package.json'))
  return json`
{
  "name": "@intrig/generated",
  "version": "d${Date.now()}",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "swc src -d dist --copy-files --strip-leading-paths && tsc --emitDeclarationOnly"
  },
  "dependencies": {
    "module-alias": "^2.2.3",
    "axios": "^1.7.7",
    "immer": "^10.1.1",
    "zod": "^3.23.8",
    "fast-xml-parser": "^4.5.0",
    "date-fns": "^4.1.0",
    "loglevel": "1.8.1",
    "pino": "^9.6.0",
    "pino-pretty": "^13.0.0",
    "qs": "^6.14.0"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "next": ">=13.0.0",
    "@types/qs": "^6.9.18"
  },
  "devDependencies": {
    "@types/glob": "^8.1.0"
  },
  "_moduleAliases": {
    "@intrig/next": "./src"
  },
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.js",
      "require": "./dist/index.js",
      "types": "./src/index.d.ts"
    },
    "./*": {
      "import": "./src/*.js",
      "require": "./dist/*.js",
      "types": "./src/*.d.ts"
    } 
  },
  "typesVersions": {
    "*": {
      "*": ["src/*"]
    }
  }
}
  `
}
