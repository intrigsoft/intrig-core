import { Injectable } from '@nestjs/common';
import {GeneratorBinding, IIntrigSourceConfig, ResourceDescriptor} from "@intrig/common";

@Injectable()
export class IntrigReactBindingService extends GeneratorBinding {
  generateGlobal(): Promise<any> {
    return Promise.resolve(undefined);
  }

  generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void> {
    return Promise.resolve(undefined);
  }

  getLibName(): string {
    return "react";
  }

  postBuild(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
