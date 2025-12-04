import {typescript, pascalCase, IntrigSourceConfig} from "@intrig/plugin-sdk";
import * as path from 'path'

export function moduleTemplate(serviceNames: string[], sources: IntrigSourceConfig[]){

  const ts = typescript(path.resolve("src", "intrig.module.ts"))

  return ts`
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
${serviceNames.map(name => `import { ${pascalCase(name)}Service } from './${name}/${name}.service';`).join('\n')}

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
  ],
  providers: [${serviceNames.map(name => `${pascalCase(name)}Service`).join(', ')}],
  exports: [${serviceNames.map(name => `${pascalCase(name)}Service`).join(', ')}],
})
export class IntrigModule {}
  `
}
