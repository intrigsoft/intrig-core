import {ResourceDescriptor} from "../model/resource-descriptor";
import {IIntrigSourceConfig, IntrigSourceConfig} from "../model/intrig-source-config";
import {SchemaDocumentation} from "../model/schema";
import {RestDocumentation} from "../model/rest-resource-data";
import {RestOptions} from "../model/intrig-config";
import {GenerateEventContext} from "../model/generate-event";

export abstract class GeneratorBinding {
  abstract generateGlobal(apisToSync: IntrigSourceConfig[]): Promise<any>;
  abstract generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig, ctx?: GenerateEventContext): Promise<void>;
  abstract getLibName(): string
  abstract postBuild(): Promise<void>
  abstract getSchemaDocumentation(result: ResourceDescriptor<any>): Promise<SchemaDocumentation>
  abstract getEndpointDocumentation(result: ResourceDescriptor<any>, schemas: ResourceDescriptor<any>[]): Promise<RestDocumentation>
  getRestOptions(): RestOptions {
    return {}
  }
}