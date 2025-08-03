import {Injectable, Logger} from '@nestjs/common';
import {
  GeneratorBinding,
  IIntrigSourceConfig, IntrigSourceConfig,
  isRestDescriptor, isSchemaDescriptor, RelatedType,
  ResourceDescriptor,
  RestData, RestDocumentation, Schema, SchemaDocumentation,
  SourceManagementService, Tab
} from "common";
import {ConfigService} from "@nestjs/config";
import path from "path";
import process from "node:process";
import {contextTemplate} from "./templates/context.template";
import {extraTemplate} from "./templates/extra.template";
import {indexTemplate} from "./templates/index.template";
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
import fsx from "fs-extra";
import {reactHookDocs} from "./templates/docs/react-hook";
import {sseHookDocs} from "./templates/docs/sse-hook";
import {asyncFunctionHookTemplate} from "./templates/source/controller/method/asyncFunctionHook.template";
import {asyncFunctionHookDocs} from "./templates/docs/async-hook";

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

  async generateGlobal(apisToSync: IntrigSourceConfig[]): Promise<any> {
    await this.dump(contextTemplate(this._path))
    await this.dump(extraTemplate(this._path))
    await this.dump(indexTemplate(this._path))
    // await this.dump(intrigMiddlewareTemplate(this._path))
    await this.dump(swcrcTemplate(this._path))
    await this.dump(loggerTemplate(this._path))
    await this.dump(mediaTypeUtilsTemplate(this._path))
    await this.dump(networkStateTemplate(this._path))
    await this.dump(packageJsonTemplate(this._path))
    await this.dump(providerTemplate(this._path, apisToSync))
    await this.dump(tsConfigTemplate(this._path))
  }

  async generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void> {
    for (const descriptor of descriptors) {
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
    await this.dump(asyncFunctionHookTemplate(descriptor, this._path))
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

  async getSchemaDocumentation(result: ResourceDescriptor<Schema>): Promise<SchemaDocumentation> {
    const tsFile = fsx.readFileSync(`${this._path}/src/${result.source}/components/schemas/${result.data.name}.ts`, "utf8");
    const collector: Record<string, string> = {}
    let collectorType = "pre"
    tsFile.split("\n").forEach(line => {
      switch (line.trim()) {
        case "//--- Zod Schemas  ---//":
          collectorType = "Zod Schema"
          break;
        case "//--- Typescript Type  ---//":
          collectorType = "Typescript Type"
          break;
        case "//--- JSON Schema  ---//":
          collectorType = "JSON Schema"
          break;
        case "//--- Simple Type  ---//":
          collectorType = "Simple Type"
          break;
        default:
          collector[collectorType] = collector[collectorType] ?? ''
          collector[collectorType] += line + "\n"
      }
    })
    return SchemaDocumentation.from({
      id: result.id,
      name: result.data.name,
      description: "", //TODO improvise description
      jsonSchema: result.data.schema,
      tabs: [
        ["Typescript Type", 'TypeScript interface definition'],
        ["JSON Schema", 'JSON Schema definition'],
        ["Zod Schema", 'Zod schema for runtime validation']
      ].map(([name, description]) => ({
        name,
        content: `
# ${name}
${description}
${"```ts"}
${collector[name]?.trim()}
${"```"}
        `
      })),
      relatedTypes: [],
      relatedEndpoints: []
    })
  }

  async getEndpointDocumentation(result: ResourceDescriptor<RestData>, schemas: ResourceDescriptor<Schema>[]): Promise<RestDocumentation> {
    const mapping = Object.fromEntries(schemas.map(a => ([a.name, RelatedType.from({name: a.name, id: a.id})])));

    const tabs: Tab[] = []
    if (result.data.responseType === 'text/event-stream') {
      tabs.push({
        name: 'SSE Hook',
        content: (await sseHookDocs(result)).content
      })
    } else {
      tabs.push({
        name: 'Stateful Hook',
        content: (await reactHookDocs(result)).content
      })
    }

    tabs.push({
      name: 'Stateless Hook',
      content: (await asyncFunctionHookDocs(result)).content
    })

    return RestDocumentation.from({
      id: result.id,
      name: result.name,
      method: result.data.method,
      path: result.data.requestUrl!,
      description: result.data.description,
      requestBody: result.data.requestBody ? mapping[result.data.requestBody] : undefined,
      contentType: result.data.contentType,
      response: result.data.response ? mapping[result.data.response] : undefined,
      responseType: result.data.responseType,
      requestUrl: result.data.requestUrl!,
      variables: result.data.variables?.map(a => ({
        ...a,
        relatedType: mapping[a.ref.split('/').pop()!],
      })) ?? [],
      responseExamples: result.data.responseExamples ?? {},
      tabs
    })
  }
}
