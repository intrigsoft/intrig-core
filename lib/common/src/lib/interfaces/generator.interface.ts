import {ResourceDescriptor} from "../model/resource-descriptor";
import {IIntrigSourceConfig} from "../model/intrig-source-config";

export abstract class GeneratorBinding {
  abstract generateGlobal(): Promise<any>;
  abstract generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void>;
  abstract getLibName(): string

  postBuild() {

  }
}