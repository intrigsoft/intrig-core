import { Injectable } from '@nestjs/common';
import {GeneratorBinding, IntrigSourceConfig, ResourceDescriptor, RestData} from '@intrig/common'

@Injectable()
export class IntrigReactBindingService extends GeneratorBinding {
  getLibName(): string {
    return "react";
  }
  override generateGlobal(): Promise<any> {
    return Promise.resolve(undefined);
  }
  override generateSource(descriptors: ResourceDescriptor<any>[], source: IntrigSourceConfig): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
