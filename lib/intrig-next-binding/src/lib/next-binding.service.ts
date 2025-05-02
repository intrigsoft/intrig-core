import {Injectable} from '@nestjs/common';
import {
  GeneratorBinding,
  IIntrigSourceConfig, isRestDescriptor, isSchemaDescriptor,
  ResourceDescriptor,
  RestData, Schema,
  SourceManagementService
} from "@intrig/common";
import { networkStateTemplate } from './templates/network-state.template';
import { providerTemplate } from './templates/provider.template';
import { indexTemplate } from './templates/index.template';
import { tsConfigTemplate } from './templates/tsconfig.template';
import { packageJsonTemplate } from './templates/packageJson.template';
import { mediaTypeUtilsTemplate } from './templates/media-type-utils.template';
import { intrigMiddlewareTemplate } from './templates/intrigMiddleware.template';
import { contextTemplate } from './templates/context.template';
import { extraTemplate } from './templates/extra.template';
import { loggerTemplate } from './templates/logger.template';
import { intrigLayoutTemplate } from './templates/intrig-layout.template';
import picomatch from 'picomatch'
import {paramsTemplate} from "./templates/source/controller/method/params.template";
import {requestHookTemplate} from "./templates/source/controller/method/requestHook.template";
import {requestMethodTemplate} from "./templates/source/controller/method/requestMethod.template";
import {downloadHookTemplate} from "./templates/source/controller/method/download.template";
import {clientIndexTemplate} from "./templates/source/controller/method/clientIndex.template";
import {serverIndexTemplate} from "./templates/source/controller/method/serverIndex.template";
import {typeTemplate} from "./templates/source/type/typeTemplate";
import {requestRouteTemplate} from "./templates/source/controller/method/requestRouteTemplate";
import {ConfigService} from "@nestjs/config";

const nonDownloadMimePatterns = picomatch([
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/*"
])

@Injectable()
export class IntrigNextBindingService extends GeneratorBinding {

  constructor(private sourceManagementService: SourceManagementService,
              private config: ConfigService
  ) {
    super();
  }

  getLibName(): string {
    return "next";
  }

  private dump = this.sourceManagementService.dump

  private _path = this.config.get("generatedDir") ?? __dirname

  override async generateGlobal(): Promise<any> {
    await this.dump(networkStateTemplate(this._path))
    await this.dump(providerTemplate(this._path))
    await this.dump(intrigLayoutTemplate(this._path))
    await this.dump(indexTemplate(this._path))
    await this.dump(tsConfigTemplate(this._path))
    await this.dump(packageJsonTemplate(this._path))
    await this.dump(mediaTypeUtilsTemplate(this._path))
    await this.dump(intrigMiddlewareTemplate(this._path))
    await this.dump(contextTemplate(this._path))
    await this.dump(extraTemplate(this._path))
    await this.dump(loggerTemplate(this._path))
  }

  override async generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void> {
    const groupedByPath: Record<string, ResourceDescriptor<RestData>[]> = {}
    for (let descriptor of descriptors) {
      if (isRestDescriptor(descriptor)) {
        await this.generateRestSource(source, descriptor)
        groupedByPath[descriptor.data.paths.join('/')] = groupedByPath[descriptor.data.paths.join('/')] || []
        groupedByPath[descriptor.data.paths.join('/')].push(descriptor)
      } else if (isSchemaDescriptor(descriptor)) {
        await this.generateSchemaSource(source, descriptor)
      }
    }
    for (const [requestUrl, matchingPaths] of Object.entries(groupedByPath)) {
      await this.dump(requestRouteTemplate(requestUrl, matchingPaths, this._path))
    }
  }

  private async generateRestSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<RestData>): Promise<void> {
    const clientExports: string[] = [];
    const serverExports: string[] = [];
    await this.dump(paramsTemplate(descriptor, clientExports, serverExports, this._path))
    await this.dump(requestHookTemplate(descriptor, clientExports, serverExports, this._path))
    await this.dump(requestMethodTemplate(descriptor, clientExports, serverExports, this._path))
    //TODO incorporate rest options.
    if (descriptor.data.method.toUpperCase() === 'GET' && nonDownloadMimePatterns(descriptor.data.responseType!)) {
      await this.dump(downloadHookTemplate(descriptor, clientExports, serverExports, this._path))
    }
    await this.dump(clientIndexTemplate([descriptor], clientExports, this._path))
    await this.dump(serverIndexTemplate([descriptor], serverExports, this._path))
  }

  private async generateSchemaSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<Schema>) {
    await this.dump(typeTemplate({
      schema: descriptor.data.schema,
      typeName: descriptor.data.name,
      sourcePath: this._path,
      paths: [source.id, "components", "schemas"],
    }))
  }
}
