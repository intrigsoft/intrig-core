import {jsonLiteral} from "@intrig/plugin-sdk";
import * as path from "path";

export function nestTsConfigTemplate() {
  const json = jsonLiteral(path.resolve('tsconfig.json'))
  return json`
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "noImplicitAny": false,
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@intrig/nest": [
        "./src"
      ],
      "@intrig/nest/*": [
        "./src/*"
      ]
    },
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "exclude": [
    "node_modules",
    "../../node_modules",
    "**/__tests__/*"
  ]
}
  `
}
