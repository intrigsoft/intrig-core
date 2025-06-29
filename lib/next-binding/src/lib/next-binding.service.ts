import {Injectable} from '@nestjs/common';
import {GeneratorBinding} from "@intrig/common";
import {
  IIntrigSourceConfig, isRestDescriptor, isSchemaDescriptor, RelatedType,
  ResourceDescriptor,
  RestData, RestDocumentation, RestOptions, Schema, SchemaDocumentation,
  SourceManagementService, Tab
} from "common";
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
import {swcrcTemplate} from "./templates/swcrc.template";
import path from "path";
import fs from "fs-extra";
import * as process from "node:process";
import { reactHookDocs } from './templates/docs/react-hook';

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

  override getRestOptions(): RestOptions {
    return {
      isConflictingVariablesAllowed: false
    };
  }

  async postBuild(): Promise<void> {
    const rootDir = this.config.get('rootDir') ?? process.cwd();
    const sourceDir = path.resolve(rootDir, '.intrig/generated/src/api/(generated)');
    const destDir = path.resolve(rootDir, 'src/app/api/(generated)');

    fs.removeSync(destDir);
    fs.copySync(sourceDir, destDir, {overwrite: true});
  }

  getLibName(): string {
    return "next";
  }

  private dump = this.sourceManagementService.dump

  private _path = this.config.get("generatedDir") ?? path.resolve(process.cwd(), '.intrig', 'generated')

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
    await this.dump(swcrcTemplate(this._path))
  }

  override async generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig): Promise<void> {
    const groupedByPath: Record<string, ResourceDescriptor<RestData>[]> = {}
    for (const descriptor of descriptors) {
      if (isRestDescriptor(descriptor)) {
        await this.generateRestSource(source, descriptor)
        groupedByPath[descriptor.data.requestUrl!] = groupedByPath[descriptor.data.requestUrl!] || []
        groupedByPath[descriptor.data.requestUrl!].push(descriptor)
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
    if (descriptor.data.method.toUpperCase() === 'GET' && !nonDownloadMimePatterns(descriptor.data.responseType!)) {
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

  async getSchemaDocumentation(result: ResourceDescriptor<Schema>): Promise<SchemaDocumentation> {
    const tsFile = fs.readFileSync(`${this._path}/src/${result.source}/components/schemas/${result.data.name}.ts`, "utf8");
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
      // tabs.push({
      //   name: 'SSE Hook',
      //   content: (await sseHookDocs(result)).content
      // })
    } else {
      tabs.push({
        name: 'React Hook',
        content: (await reactHookDocs(result)).content
      })
    }

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
