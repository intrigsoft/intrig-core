import {typescript, pascalCase, ResourceDescriptor, RestData} from "@intrig/plugin-sdk";
import * as path from 'path';
import {generateMethodTemplate} from "./method.template.js";

export function serviceTemplate(
  serviceName: string,
  descriptors: ResourceDescriptor<RestData>[],
  source: string
) {
  const ts = typescript(path.resolve('src', serviceName, `${serviceName}.service.ts`));

  const imports = new Set<string>();
  const methods: string[] = [];

  for (const descriptor of descriptors) {
    const methodCode = generateMethodTemplate(descriptor, imports, source);
    methods.push(methodCode);
  }

  return ts`
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
${[...imports].join('\n')}

@Injectable()
export class ${pascalCase(serviceName)}Service {
  constructor(private readonly httpService: HttpService) {}

${methods.join('\n\n')}
}
  `;
}
