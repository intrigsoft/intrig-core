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
import {reactContextTemplate} from "./templates/context.template";
import {reactExtraTemplate} from "./templates/extra.template";
import {reactIndexTemplate} from "./templates/index.template";
import {reactLoggerTemplate} from "./templates/logger.template";
import {reactMediaTypeUtilsTemplate} from "./templates/media-type-utils.template";
import {reactNetworkStateTemplate} from "./templates/network-state.template";
import {reactPackageJsonTemplate} from "./templates/packageJson.template";
import {reactProviderTemplate} from "./templates/provider.template";
import {reactTsConfigTemplate} from "./templates/tsconfig.template";
import {reactClientIndexTemplate} from "./templates/source/controller/method/clientIndex.template";
import {reactParamsTemplate} from "./templates/source/controller/method/params.template";
import {reactRequestHookTemplate} from "./templates/source/controller/method/requestHook.template";
import picomatch from "picomatch";
import {reactDownloadHookTemplate} from "./templates/source/controller/method/download.template";
import {reactTypeTemplate} from "./templates/source/type/typeTemplate";
import {reactSwcrcTemplate} from "./templates/swcrc.template";
import fsx from "fs-extra";
import {reactHookDocs} from "./templates/docs/react-hook";
import {reactSseHookDocs} from "./templates/docs/sse-hook";
import {reactAsyncFunctionHookTemplate} from "./templates/source/controller/method/asyncFunctionHook.template";
import {reactAsyncFunctionHookDocs} from "./templates/docs/async-hook";

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
    await this.dump(reactContextTemplate(this._path, apisToSync))
    await this.dump(reactExtraTemplate(this._path))
    await this.dump(reactIndexTemplate(this._path))
    // await this.dump(reactIntrigMiddlewareTemplate(this._path))
    await this.dump(reactSwcrcTemplate(this._path))
    await this.dump(reactLoggerTemplate(this._path))
    await this.dump(reactMediaTypeUtilsTemplate(this._path))
    await this.dump(reactNetworkStateTemplate(this._path))
    await this.dump(reactPackageJsonTemplate(this._path))
    await this.dump(reactProviderTemplate(this._path, apisToSync))
    await this.dump(reactTsConfigTemplate(this._path))
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
    await this.dump(reactClientIndexTemplate([descriptor], this._path))
    await this.dump(reactParamsTemplate(descriptor, this._path))
    await this.dump(reactRequestHookTemplate(descriptor, this._path))
    await this.dump(reactAsyncFunctionHookTemplate(descriptor, this._path))
    if ((descriptor.data.method.toUpperCase() === 'GET' && !nonDownloadMimePatterns(descriptor.data.responseType!)) ||
      descriptor.data.responseHeaders?.['Content-Disposition']
    ) {
      await this.dump(reactDownloadHookTemplate(descriptor, this._path))
    }
  }

  private async generateSchemaSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<Schema>) {
    await this.dump(reactTypeTemplate({
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
        content: (await reactSseHookDocs(result)).content
      })
    } else {
      tabs.push({
        name: 'Stateful Hook',
        content: (await reactHookDocs(result)).content
      })
    }

    tabs.push({
      name: 'Stateless Hook',
      content: (await reactAsyncFunctionHookDocs(result)).content
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
