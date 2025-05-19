import {Injectable, Logger} from '@nestjs/common';
import {
  GeneratorBinding,
  PackageManagerService,
  ResourceDescriptor, RestData, Schema,
  SyncEventContext,
  WithStatus
} from "common";
import type {IntrigConfig} from "common";
import type {GenerateEventContext, IIntrigSourceConfig} from "common";
import {IntrigConfigService} from "./intrig-config.service";
import * as path from "path";
import * as fs from 'fs-extra'
import { ConfigService } from '@nestjs/config';
import {IntrigOpenapiService} from "openapi-source";
import _ from "lodash";
import {SearchService} from "./search.service";

@Injectable()
export class OperationsService {

  private readonly logger = new Logger(OperationsService.name);

  constructor(private openApiService: IntrigOpenapiService,
              private configService: IntrigConfigService,
              private generatorBinding: GeneratorBinding,
              private packageManagerService: PackageManagerService,
              private config: ConfigService,
              private searchService: SearchService,
  ) {
  }

  @WithStatus(event => ({sourceId: '', step: 'getConfig'}))
  async getConfig(ctx: any) {
    return this.configService.get();
  }

  async sync(ctx: SyncEventContext, id?: string | undefined) {
    let config = await this.getConfig(ctx)
    let prevDescriptors = await this.getPreviousState(ctx, config);
    await this.openApiService.sync(config, id, ctx)
    let newDescriptors = await this.getNewState(ctx, config);
    await this.indexDiff(ctx, prevDescriptors, newDescriptors);
  }

  @WithStatus((p1, p2) => ({sourceId: '', step: 'indexDiff'}))
  private async indexDiff(ctx: SyncEventContext, prevDescriptors: ResourceDescriptor<RestData | Schema>[], newDescriptors: ResourceDescriptor<RestData | Schema>[]) {
    let diff = await this.diffDescriptors(prevDescriptors, newDescriptors);

    [...diff.added, ...diff.modified].forEach(descriptor => {
      this.searchService.addDescriptor(descriptor);
    })
    diff.removed.forEach(descriptor => {
      this.searchService.removeDescriptor(descriptor.id);
    })
  }

  @WithStatus(event => ({sourceId: '', step: 'loadPreviousState'}))
  private async getPreviousState(ctx: SyncEventContext, config: IntrigConfig) {
    let prevDescriptors: ResourceDescriptor<RestData | Schema>[] = []
    for (let source of config.sources) {
      try {
        let descriptors = await this.openApiService.getResourceDescriptors(source.id);
        prevDescriptors = [...prevDescriptors, ...descriptors]
      } catch (e: any) {

      }
    }
    return prevDescriptors;
  }

  @WithStatus(event => ({sourceId: '', step: 'loadNewState'}))
  private async getNewState(ctx: SyncEventContext, config: IntrigConfig) {
    let prevDescriptors: ResourceDescriptor<RestData | Schema>[] = []
    for (let source of config.sources) {
      let descriptors = await this.openApiService.getResourceDescriptors(source.id);
      prevDescriptors = [...prevDescriptors, ...descriptors]
    }
    return prevDescriptors;
  }

  private async diffDescriptors<T>(
    oldArr: ResourceDescriptor<T>[],
    newArr: ResourceDescriptor<T>[]
  ) {
    // 1. Added: in newArr but not in oldArr (by id)
    const added = _.differenceBy(newArr, oldArr, 'id');

    // 2. Removed: in oldArr but not in newArr (by id)
    const removed = _.differenceBy(oldArr, newArr, 'id');

    // 3. Intersection: items present in both sets (by id)
    const intersection = _.intersectionBy(newArr, oldArr, 'id');

    // 4. Modified: same id but deep-shape differs (including data, or any other prop)
    const modified = intersection.filter(newItem => {
      const oldItem = _.find(oldArr, ['id', newItem.id])!;
      return !_.isEqual(oldItem, newItem);
    });

    return { added, removed, modified };
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

  private async mergePackageJson(sourceFile: string, targetFile: string) {
    try {
      const sourcePackage = await fs.readJson(sourceFile);
      const targetPackage = await fs.pathExists(targetFile)
        ? await fs.readJson(targetFile)
        : {};

      const merged = {
        ...targetPackage,
        dependencies: {
          ...targetPackage.dependencies,
          ...sourcePackage.dependencies
        },
        devDependencies: {
          ...targetPackage.devDependencies,
          ...sourcePackage.devDependencies
        }
      };

      await fs.writeJson(targetFile, merged, {spaces: 2});
    } catch (error) {
      this.logger.error(`Failed to merge package.json files: ${error}`);
      throw error;
    }
  }

  @WithStatus(event => ({sourceId: '', step: 'copy-to-node-modules'}))
  private async copyContentToNodeModules(ctx: GenerateEventContext) {
    const targetLibDir = path.join(this.config.get('rootDir') ?? process.cwd(), 'node_modules', '@intrig', this.generatorBinding.getLibName())

    try {
      if (await fs.pathExists(path.join(targetLibDir, 'src'))) {
        await fs.remove(path.join(targetLibDir, 'src'));
        this.logger.log(`Removed existing ${targetLibDir}/src`);
      }

      await fs.ensureDir(targetLibDir);
      await fs.copy(path.join(this.generateDir, 'dist'), path.join(targetLibDir, 'src'));
      this.logger.log(`Copied ${targetLibDir}`);

      await this.mergePackageJson(
        path.join(this.generateDir, 'package.json'),
        path.join(targetLibDir, 'package.json')
      );
      this.logger.log(`Merged package.json files`);
    } catch (error) {
      this.logger.error(`Failed to copy content to node_modules: ${error}`);
      throw error;
    }
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
    await this.packageManagerService.installDependency("@types/node", true, false, this.generateDir)
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
