import { Injectable } from '@nestjs/common';
import {GeneratorBinding, IntrigSourceConfig, ResourceDescriptor} from "@intrig/common";

@Injectable()
export class IntrigReactBindingService extends GeneratorBinding {
  generateGlobal(): Promise<any> {
    return Promise.resolve(undefined);
  }

  generateSource(descriptors: ResourceDescriptor<any>[], source: IntrigSourceConfig): Promise<void> {
    return Promise.resolve(undefined);
  }

  getLibName(): string {
    return "react";
  }
}
