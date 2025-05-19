import {Injectable, Logger} from '@nestjs/common';
import {
  GeneratorBinding,
  IIntrigSourceConfig,
  isRestDescriptor, isSchemaDescriptor,
  ResourceDescriptor,
  RestData, Schema,
  SourceManagementService
} from "common";
import {ConfigService} from "@nestjs/config";
import path from "path";
import process from "node:process";
import {contextTemplate} from "./templates/context.template";
import {extraTemplate} from "./templates/extra.template";
import {indexTemplate} from "./templates/index.template";
import {intrigMiddlewareTemplate} from "./templates/intrigMiddleware.template";
import {loggerTemplate} from "./templates/logger.template";
import {mediaTypeUtilsTemplate} from "./templates/media-type-utils.template";
import {networkStateTemplate} from "./templates/network-state.template";
import {packageJsonTemplate} from "./templates/packageJson.template";
import {providerTemplate} from "./templates/provider.template";
import {tsConfigTemplate} from "./templates/tsconfig.template";
import {clientIndexTemplate} from "./templates/source/controller/method/clientIndex.template";
import {paramsTemplate} from "./templates/source/controller/method/params.template";
import {requestHookTemplate} from "./templates/source/controller/method/requestHook.template";
import picomatch from "picomatch";
import {downloadHookTemplate} from "./templates/source/controller/method/download.template";
import {typeTemplate} from "./templates/source/type/typeTemplate";
import {swcrcTemplate} from "./templates/swcrc.template";

const nonDownloadMimePatterns = picomatch([
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/*"
])

@Injectable()
export class ReactBindingService extends GeneratorBinding {

  private readonly logger = new Logger(ReactBindingService.name);

  constructor(private sourceManagementService: SourceManagementService,
              private config: ConfigService
  ) {
    super();
  }

  private dump = this.sourceManagementService.dump

  private _path = this.config.get("generatedDir") ?? path.resolve(process.cwd(), '.intrig', 'generated')

  async generateGlobal(): Promise<any> {
    await this.dump(contextTemplate(this._path))
    await this.dump(extraTemplate(this._path))
    await this.dump(indexTemplate(this._path))
    // await this.dump(intrigMiddlewareTemplate(this._path))
    await this.dump(swcrcTemplate(this._path))
    await this.dump(loggerTemplate(this._path))
    await this.dump(mediaTypeUtilsTemplate(this._path))
    await this.dump(networkStateTemplate(this._path))
    await this.dump(packageJsonTemplate(this._path))
    await this.dump(providerTemplate(this._path))
    await this.dump(tsConfigTemplate(this._path))
  }

  async generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void> {
    for (let descriptor of descriptors) {
      this.logger.log(`Generating source: ${JSON.stringify(descriptor)}`)
      if (isRestDescriptor(descriptor)) {
        await this.generateRestSource(source, descriptor)
      } else if (isSchemaDescriptor(descriptor)) {
        await this.generateSchemaSource(source, descriptor)
      }
    }
  }

  getLibName(): string {
    return "react";
  }

  postBuild(): Promise<void> {
    return Promise.resolve(undefined);
  }

  private async generateRestSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<RestData>) {
    await this.dump(clientIndexTemplate([descriptor], this._path))
    await this.dump(paramsTemplate(descriptor, this._path))
    await this.dump(requestHookTemplate(descriptor, this._path))
    if (descriptor.data.method.toUpperCase() === 'GET' && !nonDownloadMimePatterns(descriptor.data.responseType!)) {
      await this.dump(downloadHookTemplate(descriptor, this._path))
    }
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
