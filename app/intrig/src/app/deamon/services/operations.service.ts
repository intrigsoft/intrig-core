import { Injectable } from '@nestjs/common';
import {IntrigOpenapiService} from "@intrig/openapi";
import {GenerateEventContext, GeneratorBinding, SyncEventContext} from "@intrig/common";
import {IntrigConfigService} from "./intrig-config.service";
import {PackageManagerService} from "./package-manager.service";
import * as path from "path";
import * as fs from 'fs-extra'
import {logger} from "nx/src/utils/logger";

@Injectable()
export class OperationsService {
  constructor(private openApiService: IntrigOpenapiService,
              private configService: IntrigConfigService,
              private generatorBinding: GeneratorBinding,
              private packageManagerService: PackageManagerService
  ) {
  }

  async sync(id?: string | undefined, ctx?: SyncEventContext) {
    ctx?.status({ status: 'started', sourceId: '', step: 'getConfig' })
    let config = this.configService.get();
    ctx?.status({ status: 'success', sourceId: '', step: 'getConfig' })

    await this.openApiService.sync(config, id, ctx)
  }

  async generate(ctx?: GenerateEventContext) {
    ctx?.status({ status: 'started', sourceId: '', step: 'getConfig' })
    let config = this.configService.get();
    ctx?.status({ status: 'success', sourceId: '', step: 'getConfig' })

    ctx?.status({ status: "started", sourceId: '', step: 'clear'})
    const generateDir = path.join(process.cwd(), '.intrig', 'generated');
    if (fs.pathExistsSync(generateDir)) {
      const files = await fs.readdir(generateDir)
      for (const file of files) {
        if (file !== 'node_modules') {
          await fs.remove(path.join(generateDir, file))
        }
      }
    }

    fs.ensureDirSync(generateDir)
    ctx?.status({ status: "success", sourceId: '', step: 'clear'})

    //TODO generate data.
    for (const source of config.sources) {
      ctx?.status({ status: 'started', sourceId: source.id, step: 'read'})
      let descriptors = await this.openApiService.getResourceDescriptors(source.id);
      ctx?.status({ status: 'success', sourceId: source.id, step: 'read'})

      ctx?.status({ status: 'started', sourceId: source.id, step: 'generate'})
      await this.generatorBinding.generateSource(descriptors, source)
      ctx?.status({ status: 'success', sourceId: source.id, step: 'generate'})
    }

    await this.generatorBinding.generateGlobal()

    ctx?.status({ status: 'started', sourceId: '', step: 'install'})
    await this.packageManagerService.install(generateDir)
    ctx?.status({ status: 'success', sourceId: '', step: 'install'})

    ctx?.status({ status: 'started', sourceId: '', step: 'build'})
    await this.packageManagerService.build(generateDir)
    ctx?.status({ status: 'success', sourceId: '', step: 'build'})

    ctx?.status({ status: 'started', sourceId: '', step: 'copy'})
    const targetLibDir = path.join(process.cwd(), 'node_modules', '@intrig', this.generatorBinding.getLibName(), "src")

    if (await fs.pathExists(targetLibDir)) {
      try {
        await fs.readdir(targetLibDir).then(async (files) => {
          for (const file of files) {
            if (file !== 'package.json' && !file.endsWith('.md')) {
              await fs.remove(path.join(targetLibDir, file))
            }
          }
        })
      } catch (e) {
        logger.error(`Failed to remove existing target library files ${e}`)
      } finally {

      }
    }
    fs.copySync(generateDir, targetLibDir)
    ctx?.status({ status: 'success', sourceId: '', step: 'copy'})

    ctx?.status({status: 'started', sourceId: '', step: 'postBuild'})
    this.generatorBinding.postBuild()
    ctx?.status({status: 'success', sourceId: '', step: 'postBuild'})
  }
}
