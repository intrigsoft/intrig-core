import {ResourceDescriptor} from "../model/resource-descriptor";
import {IntrigSourceConfig} from "../model/intrig-config-source";

export abstract class GeneratorBinding {
  abstract generateGlobal(): Promise<any>;
  abstract generateSource(descriptors: ResourceDescriptor<any>[], source: IntrigSourceConfig): Promise<void>;
  abstract getLibName(): string

  postBuild() {

  }
}