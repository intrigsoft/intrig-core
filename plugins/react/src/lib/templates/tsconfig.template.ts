import {jsonLiteral} from "@intrig/plugin-sdk";
import * as path from "path";

export function reactTsConfigTemplate() {
  const json = jsonLiteral(path.resolve('tsconfig.json'))
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
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "exclude": [
    "node_modules",
    "../../node_modules",
    "**/__tests__/*"
  ]
}
  `
}
