import {Injectable} from '@nestjs/common';
import {IntrigOpenapiService} from "@intrig/openapi";
import {ConfigService} from "../config/config.service";
import {SyncEventContext} from "@intrig/common";

@Injectable()
export class OperationsService {

  constructor(private openApiService: IntrigOpenapiService,
              private configService: ConfigService,) {
  }

  async sync(id?: string | undefined, ctx?: SyncEventContext) {
    ctx?.status({ status: 'started', sourceId: '', step: 'getConfig' })
    let config = this.configService.get();
    ctx?.status({ status: 'success', sourceId: '', step: 'getConfig' })

    await this.openApiService.sync(config, id, ctx)
  }
}
