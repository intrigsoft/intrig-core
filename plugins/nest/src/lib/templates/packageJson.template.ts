import {GeneratorContext, jsonLiteral} from "@intrig/plugin-sdk";
import * as path from "path";
import * as fsx from "fs-extra";

export function packageJsonTemplate(ctx: GeneratorContext) {
  const projectDir = ctx.rootDir ?? process.cwd();
  const packageJson = fsx.readJsonSync(path.resolve(projectDir, 'package.json'));
  const json = jsonLiteral(path.resolve('package.json'))
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
    "@nestjs/common": "^10.0.0",
    "@nestjs/axios": "^3.0.0",
    "axios": "^1.7.7",
    "rxjs": "^7.8.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@swc/cli": "^0.7.7",
    "@swc/core": "^1.12.6",
    "@types/node": "^24.0.4",
    "typescript": "${packageJson.devDependencies?.typescript ?? packageJson.dependencies?.typescript ?? '^5.0.0'}"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/axios": "^3.0.0",
    "rxjs": "^7.0.0"
  },
  "_moduleAliases": {
    "@intrig/nest": "./src"
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
