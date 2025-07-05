import {jsonLiteral} from "@intrig/common";
import * as path from "path";
import * as fsx from "fs-extra";

export function packageJsonTemplate(_path: string) {
  const packageJson = fsx.readJsonSync(path.resolve(_path, '..', '..', 'package.json'));
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
    "axios": "^1.7.7",
    "date-fns": "^4.1.0",
    "eventsource-parser": "^3.0.2",
    "fast-xml-parser": "^4.5.0",
    "immer": "^10.1.1",
    "loglevel": "1.8.1",
    "module-alias": "^2.2.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@swc/cli": "^0.7.7",
    "@swc/core": "^1.12.6",
    "@types/node": "^24.0.4",
    "react": "${packageJson.dependencies.react}",
    "react-dom": "${packageJson.dependencies['react-dom']}"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "_moduleAliases": {
    "@intrig/react": "./src"
  },
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.js",
      "require": "./src/index.js",
      "types": "./src/index.d.ts"
    },
    "./*": {
      "import": "./src/*.js",
      "require": "./src/*.js",
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
