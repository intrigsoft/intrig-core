import {Injectable} from '@nestjs/common';
import {IntrigOpenapiService} from "@intrig/openapi";
import {
  GeneratorBinding,
  PackageManagerService,
  ResourceDescriptor, RestData, Schema,
  SyncEventContext,
  WithStatus
} from "@intrig/common";
import type {GenerateEventContext, IIntrigSourceConfig} from "@intrig/common";
import {IntrigConfigService} from "./intrig-config.service";
import * as path from "path";
import * as fs from 'fs-extra'
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OperationsService {
  constructor(private openApiService: IntrigOpenapiService,
              private configService: IntrigConfigService,
              private generatorBinding: GeneratorBinding,
              private packageManagerService: PackageManagerService,
              private config: ConfigService,
  ) {
  }

  @WithStatus(event => ({sourceId: '', step: 'getConfig'}))
  async getConfig(ctx: any) {
    return this.configService.get();
  }

  async sync(ctx: SyncEventContext, id?: string | undefined) {
    let config = await this.getConfig(ctx)
    await this.openApiService.sync(config, id, ctx)
  }

  async generate(ctx: GenerateEventContext) {

    let config = await this.getConfig(ctx)
    console.log(config)
    await this.clearGenerateDir(ctx);
    for (const source of config.sources) {
      let descriptors = await this.getDescriptors(ctx, source);
      await this.generateSourceContent(ctx, descriptors, source);
    }

    await this.generateGlobalContent(ctx);
    await this.installDependencies(ctx);
    await this.buildContent(ctx);
    await this.copyContentToNodeModules(ctx);
    await this.executePostBuild(ctx);
  }

  @WithStatus(event => ({sourceId: '', step: 'postBuild'}))
  private async executePostBuild(ctx: GenerateEventContext) {
    await this.generatorBinding.postBuild()
  }

  @WithStatus(event => ({sourceId: '', step: 'copy-to-node-modules'}))
  private async copyContentToNodeModules(ctx: GenerateEventContext) {
    const generateDir = this.config.get("generatedDir") ?? __dirname;
    const targetLibDir = path.join(this.config.get('rootDir') ?? __dirname, 'node_modules', '@intrig', this.generatorBinding.getLibName(), "src")

    if (await fs.pathExists(targetLibDir)) {
      let files = fs.readdirSync(targetLibDir)
      for (const file of files) {
        if (file !== 'package.json' && !file.endsWith('.md')) {
          await fs.remove(path.join(targetLibDir, file))
        }
      }
    }
    fs.copySync(generateDir, targetLibDir)
  }

  @WithStatus(event => ({sourceId: '', step: 'build'}))
  private async buildContent(ctx: GenerateEventContext) {
    const generateDir = this.config.get("generatedDir") ?? __dirname;
    return await this.packageManagerService.build(generateDir);
  }

  @WithStatus(event => ({sourceId: '', step: 'install'}))
  private async installDependencies(ctx: GenerateEventContext) {
    const generateDir = this.config.get("generatedDir") ?? __dirname;
    await this.packageManagerService.install(generateDir)
    await this.packageManagerService.installDependency("@swc/core", true, false, generateDir)
    await this.packageManagerService.installDependency("@swc/cli", true, false, generateDir)
  }

  @WithStatus(event => ({sourceId: '', step: 'generate'}))
  private async generateGlobalContent(ctx: GenerateEventContext) {
    await this.generatorBinding.generateGlobal()
  }

  @WithStatus((a, source) => ({sourceId: source.id, step: 'generate'}))
  private async generateSourceContent(ctx: GenerateEventContext, descriptors: ResourceDescriptor<RestData | Schema>[], source: IIntrigSourceConfig) {
    await this.generatorBinding.generateSource(descriptors, source)
  }

  @WithStatus(source => ({sourceId: source.id, step: 'clear'}))
  private async getDescriptors(ctx: GenerateEventContext, source: IIntrigSourceConfig) {
    return await this.openApiService.getResourceDescriptors(source.id);
  }

  @WithStatus(event => ({sourceId: '', step: 'clear'}))
  private async clearGenerateDir(ctx: GenerateEventContext) {
    const generateDir = this.config.get("generatedDir") ?? __dirname;
    if (fs.pathExistsSync(generateDir)) {
      const files = await fs.readdir(generateDir)
      for (const file of files) {
        if (!['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(file)) {
          await fs.remove(path.join(generateDir, file))
        }
      }
    }

    fs.ensureDirSync(generateDir)
    return generateDir;
  }
}
