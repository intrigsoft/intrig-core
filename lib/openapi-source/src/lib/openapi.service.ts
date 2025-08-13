import {Injectable, Logger} from '@nestjs/common';
import type {IIntrigSourceConfig, RestOptions} from 'common'
import * as crypto from 'crypto';
import {
  camelCase,
  IntrigConfig,
  ResourceDescriptor,
  RestData,
  Schema,
  SpecManagementService,
  SyncEventContext,
  WithStatus
} from 'common'
import {lastValueFrom} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {load as yamlLoad} from "js-yaml";
import RefParser from '@apidevtools/json-schema-ref-parser';
import type {OpenAPIV3_1} from "openapi-types";
import {normalize} from "./util/normalize";
import {extractRequestsFromSpec} from "./util/extractRequestsFromSpec";
import {extractSchemas} from "./util/extractSchemas";
import * as path from 'path'
import set from "lodash/set";

@Injectable()
export class IntrigOpenapiService {
  private readonly logger = new Logger(IntrigOpenapiService.name);

  constructor(private httpService: HttpService, private specManagementService: SpecManagementService) {
  }

  async sync(config: IntrigConfig, id: string | undefined, ctx: SyncEventContext) {
    this.logger.log('Starting OpenAPI sync process');
    const errors: Array<{sourceId: string, error: string}> = [];

    if (!id) {
      // Process all sources with better error isolation
      for (const source of config.sources) {
        this.logger.log(`Processing source: ${source.id}`);
        try {
          await this.doSync(source, config, ctx);
          this.logger.log(`Successfully synced source: ${source.id}`);
        } catch (e: any) {
          const errorMsg = `Failed to sync source ${source.id}: ${e.message}`;
          this.logger.error(errorMsg, e);
          errors.push({sourceId: source.id, error: errorMsg});
          
          // Continue with other sources instead of failing completely
        }
      }
    } else {
      const source = config.sources.find(s => s.id === id);
      if (!source) {
        const error = `Source ${id} not found`;
        this.logger.error(error);
        throw new Error(error);
      }
      
      this.logger.log(`Processing specific source: ${id}`);
      try {
        await this.doSync(source, config, ctx);
        this.logger.log(`Successfully synced source: ${id}`);
      } catch (e: any) {
        const errorMsg = `Failed to sync source ${id}: ${e.message}`;
        this.logger.error(errorMsg, e);
        throw new Error(errorMsg);
      }
    }
    
    if (errors.length > 0) {
      const summary = `Sync completed with ${errors.length} errors: ${errors.map(e => e.sourceId).join(', ')}`;
      this.logger.warn(summary);
      
      // If all sources failed, throw an error
      if (errors.length === config.sources.length) {
        throw new Error(`All sources failed to sync: ${errors.map(e => e.error).join('; ')}`);
      }
    }
    
    this.logger.log('OpenAPI sync process completed');
  }

  private async doSync(source: IIntrigSourceConfig, config: IntrigConfig, ctx: SyncEventContext) {
    this.logger.debug(`Resolving OpenAPI spec from URL: ${source.specUrl}`);
    const response = await this.fetchSwaggerDoc(ctx, source);
    const raw = response.data;
    const spec = await this.decodeSwaggerDoc(ctx, source, raw);
    const normalized = await this.normalize(ctx, source, spec);
    this.validate(normalized, config.restOptions);
    await this.saveContent(ctx, source, normalized);
  }

  @WithStatus((source, normalize) => ({step: 'save', sourceId: source.id}))
  private async saveContent(ctx: SyncEventContext, source: IIntrigSourceConfig, normalized: OpenAPIV3_1.Document) {
    await this.specManagementService.save(source.id, JSON.stringify(normalized, null, 2))
  }

  @WithStatus((source, spec) => ({step: 'normalize', sourceId: source.id}))
  private async normalize(ctx: SyncEventContext, source: IIntrigSourceConfig, spec: any) {
    const document = await RefParser.bundle(await spec) as OpenAPIV3_1.Document;
    return normalize(document);
  }

  @WithStatus((source, row) => ({step: 'decode', sourceId: source.id}))
  private decodeSwaggerDoc(ctx: SyncEventContext, source: IIntrigSourceConfig, raw: string) {
    let spec: any;
    try {
      spec = JSON.parse(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as JSON');
    } catch {
      this.logger.debug('Failed to parse as JSON, attempting YAML parse');
      spec = yamlLoad(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as YAML');
    }
    return spec;
  }

  @WithStatus((source) => ({step: 'fetch', sourceId: source.id}))
  private async fetchSwaggerDoc(ctx: SyncEventContext, source: IIntrigSourceConfig) {
    return await lastValueFrom(
      this.httpService.get<string>(source.specUrl, {responseType: 'text'}),
    );
  }

  async getResourceDescriptors(id: string): Promise<{descriptors: ResourceDescriptor<RestData | Schema>[], hash: string}> {
    const document = await this.specManagementService.read(id);
    if (!document) {
      throw new Error(`Spec ${id} not found`)
    }
    const restData = extractRequestsFromSpec(document);
    const schemas = extractSchemas(document);

    const sha1 = (str: string) => crypto.createHash('sha1').update(str).digest('hex');

    const hash: string = (document.info as any)['x-intrig-hash'];

    const descriptors = [
      ...restData.map(restData => ResourceDescriptor.from({
        id: sha1(`${id}_${restData.method}_${restData.paths.join('_')}_${restData.operationId}_${restData.contentType}_${restData.responseType}`),
        name: camelCase(restData.operationId),
        source: id,
        type: 'rest',
        data: restData,
        path: path.join(id, ...restData.paths, camelCase(restData.operationId))
      })),
      ...schemas.map(schema => ResourceDescriptor.from({
        id: sha1(`${id}_schema_${schema.name}`),
        name: schema.name,
        source: id,
        type: 'schema',
        path: path.join(id, "components", "schemas"),
        data: schema
      }))
    ];

    return { descriptors, hash };
  }

  async getHash(id: string): Promise<string> {
    const document = await this.specManagementService.read(id);
    if (!document) {
      throw new Error(`Spec ${id} not found`)
    }
    return (document.info as any)['x-intrig-hash'];
  }

  private validate(normalized: OpenAPIV3_1.Document, restOptions: RestOptions | undefined) {
    function validateForConflictingVariables() {
      const collector: Record<string, unknown> = {}
      for (let pathsKey in normalized.paths) {
        pathsKey = pathsKey as keyof OpenAPIV3_1.PathsObject;
        set(collector, pathsKey.replaceAll("/", "."), {})
      }

      const hasMultipleParameters = (obj: Record<string, unknown> | unknown): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        const paramCount = Object.keys(obj)
          .filter(key => key.startsWith('{'))
          .length;
        return paramCount > 1;
      };

      const findPathsWithMultipleParams = (obj: any, currentPath = ''): string[] => {
        let result: string[] = [];

        if (typeof obj !== 'object' || obj === null) return result;

        if (hasMultipleParameters(obj)) {
          result.push(currentPath);
        }

        for (const key in obj) {
          result = result.concat(findPathsWithMultipleParams(obj[key], currentPath ? `${currentPath}.${key}` : key));
        }

        return result;
      };

      const pathsWithMultipleParams = findPathsWithMultipleParams(collector);
      if (pathsWithMultipleParams.length > 0) {
        throw new Error(`Found paths with multiple parameters: ${pathsWithMultipleParams.join(', ')}`);
      }
    }
    if (restOptions?.isConflictingVariablesAllowed === false) {
      validateForConflictingVariables();
    }
  }
}
