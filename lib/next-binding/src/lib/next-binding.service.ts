import {Injectable, Logger} from '@nestjs/common';
import {
  GeneratorBinding, GeneratorContext, GenerateEventContext,
  IIntrigSourceConfig, IntrigSourceConfig,
  isRestDescriptor, isSchemaDescriptor, RelatedType,
  ResourceDescriptor,
  RestData, RestDocumentation, RestOptions, Schema, SchemaDocumentation,
  SourceManagementService, Tab
} from "common";
import { nextNetworkStateTemplate } from './templates/network-state.template';
import { nextProviderInterfacesTemplate } from './templates/provider/interfaces.template';
import { nextProviderReducerTemplate } from './templates/provider/reducer.template';
import { nextProviderAxiosConfigTemplate } from './templates/provider/axios-config.template';
import { nextProviderComponentsTemplate } from './templates/provider/components.template';
import { nextProviderHooksTemplate } from './templates/provider/hooks.template';
import { nextProviderMainTemplate } from './templates/provider/main.template';
import { nextIndexTemplate } from './templates/index.template';
import { nextTsConfigTemplate } from './templates/tsconfig.template';
import { nextPackageJsonTemplate } from './templates/packageJson.template';
import { nextMediaTypeUtilsTemplate } from './templates/media-type-utils.template';
import { nextIntrigMiddlewareTemplate } from './templates/intrigMiddleware.template';
import { nextContextTemplate } from './templates/context.template';
import { nextExtraTemplate } from './templates/extra.template';
import { nextLoggerTemplate } from './templates/logger.template';
import { nextIntrigLayoutTemplate } from './templates/intrig-layout.template';
import picomatch from 'picomatch'
import {nextParamsTemplate} from "./templates/source/controller/method/params.template";
import {nextRequestHookTemplate} from "./templates/source/controller/method/requestHook.template";
import {nextRequestMethodTemplate} from "./templates/source/controller/method/requestMethod.template";
import {nextDownloadHookTemplate} from "./templates/source/controller/method/download.template";
import {nextClientIndexTemplate} from "./templates/source/controller/method/clientIndex.template";
import {nextServerIndexTemplate} from "./templates/source/controller/method/serverIndex.template";
import {nextTypeTemplate} from "./templates/source/type/typeTemplate";
import {nextRequestRouteTemplate} from "./templates/source/controller/method/requestRouteTemplate";
import {ConfigService} from "@nestjs/config";
import {nextSwcrcTemplate} from "./templates/swcrc.template";
import path from "path";
import fs from "fs-extra";
import * as process from "node:process";
import { nextReactHookDocs } from './templates/docs/react-hook';
import {nextAsyncFunctionHookTemplate} from "./templates/source/controller/method/asyncFunctionHook.template";
import {typeUtilsTemplate} from "./templates/type-utils.template";
import {nextSseHookDocs} from "./templates/docs/sse-hook";
import {nextAsyncFunctionHookDocs} from "./templates/docs/async-hook";
import { schemaJsonSchemaDoc, schemaTypescriptDoc, schemaZodSchemaDoc } from './templates/docs/schema';

const nonDownloadMimePatterns = picomatch([
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "application/event-stream",
  "text/*"
])

@Injectable()
export class IntrigNextBindingService extends GeneratorBinding {

  private readonly logger = new Logger(IntrigNextBindingService.name);

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

  override async generateGlobal(apisToSync: IntrigSourceConfig[]): Promise<any> {
    await this.dump(nextNetworkStateTemplate(this._path))
    // Generate modular provider templates
    await this.dump(nextProviderInterfacesTemplate(this._path, apisToSync))
    await this.dump(nextProviderReducerTemplate(this._path))
    await this.dump(nextProviderAxiosConfigTemplate(this._path, apisToSync))
    await this.dump(nextProviderComponentsTemplate(this._path, apisToSync))
    await this.dump(nextProviderHooksTemplate(this._path))
    await this.dump(nextProviderMainTemplate(this._path, apisToSync))
    await this.dump(nextIntrigLayoutTemplate(this._path))
    await this.dump(nextIndexTemplate(this._path))
    await this.dump(nextTsConfigTemplate(this._path))
    await this.dump(nextPackageJsonTemplate(this._path))
    await this.dump(nextMediaTypeUtilsTemplate(this._path))
    await this.dump(nextIntrigMiddlewareTemplate(this._path))
    await this.dump(nextContextTemplate(this._path))
    await this.dump(nextExtraTemplate(this._path))
    await this.dump(nextLoggerTemplate(this._path))
    await this.dump(nextSwcrcTemplate(this._path))
    await this.dump(typeUtilsTemplate(this._path))
  }

  override async generateSource(descriptors: ResourceDescriptor<any>[], source: IIntrigSourceConfig, generatorCtx?: GenerateEventContext): Promise<void> {
    //TODO improve this logic to catch potential conflicts.
    const potentiallyConflictingDescriptors = descriptors.filter(isRestDescriptor)
      .sort((a, b) => (a.data.contentType === "application/json" ? -1 : 0) - (b.data.contentType === "application/json" ? -1 : 0))
      .filter((descriptor, index, array) => array.findIndex(other => other.data.operationId === descriptor.data.operationId) !== index)
      .map(descriptor => descriptor.id);

    const ctx = {
      potentiallyConflictingDescriptors,
      generatorCtx
    };

    const groupedByPath: Record<string, ResourceDescriptor<RestData>[]> = {}
    for (const descriptor of descriptors) {
      this.logger.log(`Generating source: ${descriptor.name}`)
      if (isRestDescriptor(descriptor)) {
        await this.generateRestSource(source, descriptor, ctx)
        groupedByPath[descriptor.data.requestUrl!] = groupedByPath[descriptor.data.requestUrl!] || []
        groupedByPath[descriptor.data.requestUrl!].push(descriptor)
      } else if (isSchemaDescriptor(descriptor)) {
        await this.generateSchemaSource(source, descriptor, ctx)
      }
    }
    for (const [requestUrl, matchingPaths] of Object.entries(groupedByPath)) {
      await this.dump(nextRequestRouteTemplate(requestUrl, matchingPaths, this._path, ctx))
    }
  }

  private async generateRestSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<RestData>, ctx: GeneratorContext): Promise<void> {
    const clientExports: string[] = [];
    const serverExports: string[] = [];
    await this.dump(nextParamsTemplate(descriptor, clientExports, serverExports, this._path))
    await this.dump(nextRequestHookTemplate(descriptor, clientExports, serverExports, this._path, ctx))
    await this.dump(nextRequestMethodTemplate(descriptor, clientExports, serverExports, this._path, ctx))
    await this.dump(nextAsyncFunctionHookTemplate(descriptor, this._path, ctx))
    
    if ((descriptor.data.method.toUpperCase() === 'GET' &&
        (!nonDownloadMimePatterns(descriptor.data.responseType!) || descriptor.data.responseType !== '*/*')
      ) ||
      descriptor.data.responseHeaders?.['content-disposition']
    ) {
      await this.dump(nextDownloadHookTemplate(descriptor, clientExports, serverExports, this._path, ctx))
    }
    await this.dump(nextClientIndexTemplate([descriptor], clientExports, this._path, ctx))
    await this.dump(nextServerIndexTemplate([descriptor], serverExports, this._path, ctx))
  }

  private async generateSchemaSource(source: IIntrigSourceConfig, descriptor: ResourceDescriptor<Schema>, ctx: {
    potentiallyConflictingDescriptors: string[];
    generatorCtx: GenerateEventContext | undefined;
  }) {
    const content = nextTypeTemplate({
      schema: descriptor.data.schema,
      typeName: descriptor.data.name,
      sourcePath: this._path,
      paths: [source.id, "components", "schemas"],
    });
    ctx.generatorCtx?.getCounter(source.id)?.inc("Data Types")
    await this.dump(content)
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
    const tabs: Tab[] = []
    tabs.push({ name: 'Typescript Type', content: (await schemaTypescriptDoc(collector['Typescript Type'], result)).content })
    tabs.push({ name: 'JSON Schema', content: (await schemaJsonSchemaDoc(collector['JSON Schema'], result)).content })
    tabs.push({ name: 'Zod Schema', content: (await schemaZodSchemaDoc(collector['Zod Schema'], result)).content })

    return SchemaDocumentation.from({
      id: result.id,
      name: result.data.name,
      description: result.data.schema?.description ?? '',
      jsonSchema: result.data.schema,
      tabs,
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
        content: (await nextSseHookDocs(result)).content
      })
    } else {
      tabs.push({
        name: 'React Hook',
        content: (await nextReactHookDocs(result)).content
      })
    }
    
    tabs.push({
      name: 'Async Hook',
      content: (await nextAsyncFunctionHookDocs(result)).content
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
