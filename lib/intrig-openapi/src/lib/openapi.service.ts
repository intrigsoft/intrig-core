import {Injectable, Logger} from '@nestjs/common';
import {IntrigConfig, IntrigSourceConfig, SpecManagementService, SyncEventContext} from '@intrig/common'
import {lastValueFrom} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {load as yamlLoad} from "js-yaml";
import RefParser from '@apidevtools/json-schema-ref-parser';
import {OpenAPIV3_1} from "openapi-types";
import {normalize} from "./util/normalize";

@Injectable()
export class IntrigOpenapiService {
  private readonly logger = new Logger(IntrigOpenapiService.name);

  constructor(private httpService: HttpService, private specManagementService: SpecManagementService) {}

  async sync(config: IntrigConfig, id: string | undefined, ctx: SyncEventContext | undefined) {
    const logger = new Logger(IntrigOpenapiService.name);
    logger.log('Starting OpenAPI sync process');

    if (!id) {
      for (const source of config.sources) {
        logger.log(`Processing source: ${source.id}`);
        await this.doSync(source, config, ctx)
      }
    } else {
      let source = config.sources.find(s => s.id === id);
      if (!source) {
        logger.error(`Source ${id} not found`);
        throw new Error(`Source ${id} not found`)
      }
      logger.log(`Processing specific source: ${id}`);
      await this.doSync(source, config, ctx)
    }
    logger.log('OpenAPI sync process completed');
  }

  private async doSync(source: IntrigSourceConfig, config: IntrigConfig, ctx: SyncEventContext | undefined) {
    this.logger.debug(`Resolving OpenAPI spec from URL: ${source.specUrl}`);
    ctx?.status({ status: 'started', step: 'fetch', sourceId: source.id})
    const response = await lastValueFrom(
      this.httpService.get<string>(source.specUrl, {responseType: 'text'}),
    );
    ctx?.status({ status: 'success', step: 'fetch', sourceId: source.id})

    const raw = response.data;
    let spec: any;

    ctx?.status({ status: 'started', step: 'decode', sourceId: source.id})
    try {
      spec = JSON.parse(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as JSON');
    } catch {
      this.logger.debug('Failed to parse as JSON, attempting YAML parse');
      spec = yamlLoad(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as YAML');
    }

    ctx?.status({ status: 'success', step: 'decode', sourceId: source.id})

    ctx?.status({ status: 'started', step: 'normalize', sourceId: source.id})
    let document = await RefParser.bundle(spec) as OpenAPIV3_1.Document;
    let normalized = normalize(document);
    ctx?.status({ status: 'success', step: 'normalize', sourceId: source.id})

    ctx?.status({ status: 'started', step: 'save', sourceId: source.id})
    await this.specManagementService.save(source.id, JSON.stringify(normalized, null, 2))
    ctx?.status({ status: 'success', step: 'save', sourceId: source.id})
  }
}
