import {Injectable} from '@nestjs/common';
import {
  GeneratorBinding,
  PackageManagerService,
  ResourceDescriptor, RestData, Schema,
  SyncEventContext,
  WithStatus
} from "common";
import type {GenerateEventContext, IIntrigSourceConfig} from "common";
import {IntrigConfigService} from "./intrig-config.service";
import * as path from "path";
import * as fs from 'fs-extra'
import { ConfigService } from '@nestjs/config';
import {IntrigOpenapiService} from "openapi-source";

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

  private generateDir = this.config.get("generatedDir") ?? path.resolve(process.cwd(), ".intrig", "generated");

  @WithStatus(event => ({sourceId: '', step: 'copy-to-node-modules'}))
  private async copyContentToNodeModules(ctx: GenerateEventContext) {
    const targetLibDir = path.join(this.config.get('rootDir') ?? process.cwd(), 'node_modules', '@intrig', this.generatorBinding.getLibName(), "src")

    if (await fs.pathExists(targetLibDir)) {
      let files = fs.readdirSync(targetLibDir)
      for (const file of files) {
        if (file !== 'package.json' && !file.endsWith('.md')) {
          await fs.remove(path.join(targetLibDir, file))
        }
      }
    }
    fs.copySync(this.generateDir, targetLibDir)
  }

  @WithStatus(event => ({sourceId: '', step: 'build'}))
  private async buildContent(ctx: GenerateEventContext) {
    return await this.packageManagerService.build(this.generateDir);
  }

  @WithStatus(event => ({sourceId: '', step: 'install'}))
  private async installDependencies(ctx: GenerateEventContext) {
    await this.packageManagerService.install(this.generateDir)
    await this.packageManagerService.installDependency("@swc/core", true, false, this.generateDir)
    await this.packageManagerService.installDependency("@swc/cli", true, false, this.generateDir)
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
    if (fs.pathExistsSync(this.generateDir)) {
      const files = await fs.readdir(this.generateDir)
      for (const file of files) {
        if (!['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(file)) {
          await fs.remove(path.join(this.generateDir, file))
        }
      }
    }

    fs.ensureDirSync(this.generateDir)
    return this.generateDir;
  }
}
