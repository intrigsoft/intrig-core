import {jsonLiteral} from "common";
import * as path from "path";

export function tsConfigTemplate(_path: string) {
  const json = jsonLiteral(path.resolve(_path, 'tsconfig.json'))
  return json`
{
  "compilerOptions": {
    "target": "es2020",
    "module": "ESNext",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "noImplicitAny": false,
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@intrig/react": [
        "./src"
      ],
      "@intrig/react/*": [
        "./src/*"
      ],
      "intrig-hook": ["src/config/intrig"]
    },
    "jsx": "react-jsx"
  },
  "exclude": [
    "node_modules",
    "../../node_modules",
    "**/__tests__/*"
  ]
}
  `
}
