import {typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function indexTemplate(serviceNames: string[]){

  const ts = typescript(path.resolve("src", "index.ts"))

  return ts`
export * from './intrig.module';
${serviceNames.map(name => `export * from './${name}/${name}.service';`).join('\n')}
  `
}
