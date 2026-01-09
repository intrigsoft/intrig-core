import {Inject, Injectable, Logger} from '@nestjs/common';
import {GenerateEventContext, IIntrigSourceConfig, IntrigConfig, SourceManagementService} from "common";
import {
  // GeneratorBinding,
  IntrigSourceConfig,
  PackageManagerService,
  ResourceDescriptor,
  RestData,
  Schema,
  SyncEventContext,
  WithStatus
} from "common";
import {IntrigConfigService} from "./intrig-config.service";
import * as path from "path";
import * as fs from 'fs-extra'
import {ConfigService} from '@nestjs/config';
import {IntrigOpenapiService} from "openapi-source";
import {SearchService} from "./search.service";
import type {CompiledContent, IntrigGeneratorPlugin} from "@intrig/plugin-sdk";
import {LazyPluginService} from "../../plugins/lazy-plugin.service";

interface TempBuildContext {
  srcDir: string;
}

@Injectable()
export class OperationsService {

  private readonly logger = new Logger(OperationsService.name);

  // Add sync coordination
  private syncInProgress = new Set<string>();
  private readonly SYNC_TIMEOUT = 300000; // 5 minutes timeout

  constructor(private openApiService: IntrigOpenapiService,
              private configService: IntrigConfigService,
              private packageManagerService: PackageManagerService,
              private config: ConfigService,
              private searchService: SearchService,
              private lazyPluginService: LazyPluginService,
              private sourceManagementService: SourceManagementService,
  ) {
  }

  @WithStatus(event => ({sourceId: '', step: 'getConfig'}))
  async getConfig(ctx: any) {
    return this.configService.get();
  }

  async sync(ctx: SyncEventContext, id?: string | undefined) {
    const syncKey = id || 'all';

    // Check if sync is already in progress
    if (this.syncInProgress.has(syncKey)) {
      const error = `Sync already in progress for: ${syncKey}`;
      this.logger.warn(error);
      throw new Error(error);
    }

    // Add timeout protection
    const timeoutId = setTimeout(() => {
      this.syncInProgress.delete(syncKey);
      this.logger.error(`Sync timeout for ${syncKey} after ${this.SYNC_TIMEOUT}ms`);
    }, this.SYNC_TIMEOUT);

    this.syncInProgress.add(syncKey);
    this.logger.log(`Starting sync operation for: ${syncKey}`);

    try {
      const config = await this.getConfig(ctx);
      const prevDescriptors = await this.getPreviousState(ctx, config);
      // const restOptions = this.generatorBinding.getRestOptions();

      await this.openApiService.sync({
        ...config,
        restOptions: {
          ...config.restOptions,
          // ...restOptions
        }
      }, id, ctx);

      const newDescriptors = await this.getNewState(ctx, config);
      await this.indexDiff(ctx, prevDescriptors, newDescriptors);

      this.logger.log(`Sync operation completed successfully for: ${syncKey}`);

    } catch (error: any) {
      this.logger.error(`Sync operation failed for ${syncKey}: ${error.message}`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.syncInProgress.delete(syncKey);
    }
  }

  @WithStatus((p1, p2) => ({sourceId: '', step: 'indexDiff'}))
  private async indexDiff(ctx: SyncEventContext, prevDescriptors: ResourceDescriptor<RestData | Schema>[], newDescriptors: ResourceDescriptor<RestData | Schema>[]) {

    this.searchService.clearAll()
    newDescriptors.forEach(this.searchService.addDescriptor.bind(this.searchService))
  }

  @WithStatus(event => ({sourceId: '', step: 'loadPreviousState'}))
  private async getPreviousState(ctx: SyncEventContext, config: IntrigConfig) {
    let prevDescriptors: ResourceDescriptor<RestData | Schema>[] = [];
    const errors: string[] = [];

    for (const source of config.sources) {
      try {
        const {descriptors} = await this.openApiService.getResourceDescriptors(source.id);
        prevDescriptors = [...prevDescriptors, ...descriptors];
        this.logger.debug(`Loaded ${descriptors.length} descriptors from source ${source.id}`);
      } catch (e: any) {
        const errorMsg = `Failed to load previous state for source ${source.id}: ${e.message}`;
        this.logger.warn(errorMsg);
        errors.push(errorMsg);

        // If it's a critical error (not just missing file), we might want to fail
        if (e.message.includes('Invalid JSON') || e.message.includes('corrupted')) {
          throw new Error(`Critical error in getPreviousState: ${errorMsg}`);
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`getPreviousState completed with ${errors.length} errors: ${errors.join('; ')}`);
    }

    this.logger.log(`Loaded total of ${prevDescriptors.length} previous descriptors`);
    return prevDescriptors;
  }

  @WithStatus(event => ({sourceId: '', step: 'loadNewState'}))
  private async getNewState(ctx: SyncEventContext, config: IntrigConfig) {
    this.logger.log('Loading new state')
    let prevDescriptors: ResourceDescriptor<RestData | Schema>[] = []
    for (const source of config.sources) {
      const {descriptors} = await this.openApiService.getResourceDescriptors(source.id);
      prevDescriptors = [...prevDescriptors, ...descriptors]
    }
    return prevDescriptors;
  }

  // private async diffDescriptors<T>(
  //   oldArr: ResourceDescriptor<T>[],
  //   newArr: ResourceDescriptor<T>[]
  // ) {
  //   // 1. Added: in newArr but not in oldArr (by id)
  //   const added = _.differenceBy(newArr, oldArr, 'id');
  //
  //   // 2. Removed: in oldArr but not in newArr (by id)
  //   const removed = _.differenceBy(oldArr, newArr, 'id');
  //
  //   // 3. Intersection: items present in both sets (by id)
  //   const intersection = _.intersectionBy(newArr, oldArr, 'id');
  //
  //   // 4. Modified: same id but deep-shape differs (including data, or any other prop)
  //   const modified = intersection.filter(newItem => {
  //     const oldItem = _.find(oldArr, ['id', newItem.id])!;
  //     return !_.isEqual(oldItem, newItem);
  //   });
  //
  //   return { added, removed, modified };
  // }

  async generate(ctx: GenerateEventContext) {

    const config = await this.getConfig(ctx)
    await this.clearGenerateDir(ctx);
    const hashes: Record<string, string> = {}
    const _descriptors: ResourceDescriptor<any>[] = []
    for (const source of config.sources) {
      const {descriptors, hash, skippedEndpoints} = await this.getDescriptors(ctx, source);
      hashes[source.id] = hash;
      ctx.setSkippedEndpoints(source.id, skippedEndpoints);
      _descriptors.push(...descriptors)
      // await this.generateSourceContent(ctx, descriptors, source);
    }
    await this.generateContent(ctx, config.sources, _descriptors);
    // await this.generateGlobalContent(ctx, config.sources);
    await this.installDependencies(ctx);
    await this.buildContent(ctx);
    const tempBuildContext: TempBuildContext = (config as any).__dangorouslyOverrideBuild;
    if (tempBuildContext) {
      await this.copyContentToSource(ctx, tempBuildContext);
    } else {
      await this.copyContentToNodeModules(ctx, hashes);
    }
    await this.executePostBuild(ctx);
    await this.finalize(ctx)
  }

  @WithStatus(event => ({sourceId: '', step: 'postBuild'}))
  private async executePostBuild(ctx: GenerateEventContext) {
    // await this.generatorBinding.postBuild()
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
        },
        // Keep original plugin exports (pointing to dist/) - don't override with generated exports
        // The generated SDK code goes to src/ but the plugin entry point must remain dist/
        exports: targetPackage.exports,
        typesVersions: targetPackage.typesVersions,
      };

      await fs.writeJson(targetFile, merged, {spaces: 2});
    } catch (error) {
      this.logger.error(`Failed to merge package.json files: ${error}`);
      throw error;
    }
  }

  @WithStatus(event => ({sourceId: '', step: 'copy-to-node-modules'}))
  private async copyContentToNodeModules(ctx: GenerateEventContext, hashes: Record<string, string>) {
    const pluginName = await this.lazyPluginService.getPluginName();
    const targetLibDir = path.join(this.config.get('rootDir') ?? process.cwd(), 'node_modules', pluginName)

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
      await fs.writeJson(path.join(targetLibDir, 'hashes.json'), hashes, {spaces: 2});
      this.logger.log(`Wrote hashes.json to ${targetLibDir}`);
    } catch (error) {
      this.logger.error(`Failed to copy content to node_modules: ${error}`);
      throw error;
    }
  }

  @WithStatus(event => ({sourceId: '', step: 'copy-to-node-modules'}))
  private async copyContentToSource(ctx: GenerateEventContext, tempBuildContext: TempBuildContext) {
    const pluginName = await this.lazyPluginService.getPluginName();
    const targetLibDir = path.join(this.config.get('rootDir') ?? process.cwd(), tempBuildContext.srcDir, pluginName)
    if (fs.pathExistsSync(targetLibDir)) {
      await fs.remove(targetLibDir);
      this.logger.log(`Removed existing ${targetLibDir}`);
    }

    await fs.ensureDir(targetLibDir);
    await fs.copy(path.join(this.generateDir, 'src'), targetLibDir);

    this.logger.log(`Copied ${targetLibDir}`);
    return "";
  }

  @WithStatus(event => ({sourceId: '', step: 'build'}))
  private async buildContent(ctx: GenerateEventContext) {
    return await this.packageManagerService.build(this.generateDir);
  }

  @WithStatus(event => ({sourceId: '', step: 'install'}))
  private async installDependencies(ctx: GenerateEventContext) {
    await this.packageManagerService.install(this.generateDir)
  }

  @WithStatus((...args) => ({sourceId: '', step: 'generate'}))
  private async generateContent(ctx: GenerateEventContext, sources: IntrigSourceConfig[], descriptors: ResourceDescriptor<any>[]) {
    const _generatorDir = this.generateDir
    const plugin = await this.lazyPluginService.getPlugin();
    const rootDir = this.config.get('rootDir') ?? process.cwd();
    const dump = this.sourceManagementService.dump;
    return plugin.generate({
      sources,
      restDescriptors: descriptors.filter(d => d.type === 'rest') as ResourceDescriptor<RestData>[],
      schemaDescriptors: descriptors.filter(d => d.type === 'schema') as ResourceDescriptor<Schema>[],
      async dump(compilerContent: Promise<CompiledContent>) {
        const {content, path: _path} = await compilerContent
        await dump(Promise.resolve({
          content,
          path: path.resolve(_generatorDir, path.relative(rootDir, _path))
        }))
      },
      rootDir: rootDir,
    });
  }

  // @WithStatus(event => ({sourceId: '', step: 'generate'}))
  // private async generateGlobalContent(ctx: GenerateEventContext, apisToSync: IntrigSourceConfig[]) {
  //   await this.generatorBinding.generateGlobal(apisToSync)
  // }
  //
  // @WithStatus((a, source) => ({sourceId: source.id, step: 'generate'}))
  // private async generateSourceContent(ctx: GenerateEventContext, descriptors: ResourceDescriptor<RestData | Schema>[], source: IIntrigSourceConfig) {
  //   await this.generatorBinding.generateSource(descriptors, source, ctx)
  // }

  @WithStatus(source => ({sourceId: source.id, step: 'clear'}))
  private async getDescriptors(ctx: GenerateEventContext, source: IIntrigSourceConfig) {
    const descriptors = await this.openApiService.getResourceDescriptors(source.id);
    // Hash is now available for operations.service to use
    return descriptors;
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

  async verify(hashes: Record<string, string>) {
    this.logger.log('Verifying hashes');
    
    try {
      // 1. Load intrigConfig
      const intrigConfig = this.configService.get();
      const sources = intrigConfig.sources || [];
      
      // 2. Check that each key in hashes has a matching source id
      const sourceIds = new Set(sources.map(source => source.id));
      const hashKeys = Object.keys(hashes);
      
      for (const hashKey of hashKeys) {
        if (!sourceIds.has(hashKey)) {
          this.logger.error(`Hash key '${hashKey}' does not have a matching source id`);
          return { 
            status: 'conflict', 
            message: `Hash key '${hashKey}' does not have a matching source id`,
            statusCode: 409
          };
        }
      }
      
      // 3. Check that there are no more sources than hashes
      if (sources.length > hashKeys.length) {
        const extraSources = sources
          .map(s => s.id)
          .filter(id => !hashKeys.includes(id));
        this.logger.error(`There are more sources than hashes. Extra sources: ${extraSources.join(', ')}`);
        return { 
          status: 'conflict', 
          message: `There are more sources than hashes. Extra sources: ${extraSources.join(', ')}`,
          statusCode: 409
        };
      }
      
      // 4. Get hash for each source and validate they match
      for (const source of sources) {
        try {
          const actualHash = await this.openApiService.getHash(source.id);
          const expectedHash = hashes[source.id];
          
          if (actualHash !== expectedHash) {
            this.logger.error(`Hash mismatch for source '${source.id}'. Expected: ${expectedHash}, Actual: ${actualHash}`);
            return { 
              status: 'conflict', 
              message: `Hash mismatch for source '${source.id}'. Expected: ${expectedHash}, Actual: ${actualHash}`,
              statusCode: 409
            };
          }
        } catch (error: any) {
          this.logger.error(`Failed to get hash for source '${source.id}': ${error.message}`);
          return { 
            status: 'conflict', 
            message: `Failed to get hash for source '${source.id}': ${error.message}`,
            statusCode: 409
          };
        }
      }
      
      // 5. All validations passed
      this.logger.log('All hash validations passed successfully');
      return { 
        status: 'verified', 
        message: 'All hashes match successfully',
        hashCount: Object.keys(hashes).length,
        statusCode: 200
      };
      
    } catch (error: any) {
      this.logger.error(`Verification failed with error: ${error.message}`);
      return { 
        status: 'conflict', 
        message: `Verification failed: ${error.message}`,
        statusCode: 409
      };
    }
  }

  private async finalize(ctx: GenerateEventContext) {
    ctx.status({
      step: 'finalize',
      status: 'started',
      sourceId: ''
    })
    ctx.status({
      step: 'finalize',
      sourceId: '',
      status: 'success',
      info: JSON.stringify({
        skipEndpoints: ctx.getSkippedEndpoints(),
        generationStats: ctx.getCodeGenerationBreakdown()
      })
    })
  }
}
