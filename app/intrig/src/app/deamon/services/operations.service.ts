import { Injectable } from '@nestjs/common';
import {IntrigOpenapiService} from "@intrig/openapi";
import {GenerateEventContext, SpecManagementService, SyncEventContext} from "@intrig/common";
import {IntrigConfigService} from "./intrig-config.service";

@Injectable()
export class OperationsService {
  constructor(private openApiService: IntrigOpenapiService,
              private configService: IntrigConfigService,
              private specManagementService: SpecManagementService) {
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

    for (const source of config.sources) {
      ctx?.status({ status: 'started', sourceId: source.id, step: 'read'})
      let dataStr = await this.specManagementService.read(source.id);
      ctx?.status({ status: 'success', sourceId: source.id, step: 'read'})

      if (dataStr) {
        ctx?.status({ status: 'started', sourceId: source.id, step: 'generate'})
        let data = JSON.parse(dataStr);
        //TODO generate code based on data
        ctx?.status({ status: 'success', sourceId: source.id, step: 'generate'})
      }
    }
  }
}
