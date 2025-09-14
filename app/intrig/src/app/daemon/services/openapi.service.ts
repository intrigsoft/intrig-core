import {Injectable, Logger} from '@nestjs/common';
import {HttpService} from "@nestjs/axios";
import {IntrigSourceConfig, IntrigSourceTransformResponse} from "common";
import {lastValueFrom} from "rxjs";
import {load as yamlLoad} from "js-yaml";

@Injectable()
export class OpenapiService {
  private readonly logger = new Logger(OpenapiService.name);

  constructor(private httpService: HttpService) {
  }

  async resolveSource(url: string): Promise<IntrigSourceTransformResponse> {
    this.logger.debug(`Resolving OpenAPI spec from URL: ${url}`);
    const response = await lastValueFrom(
      this.httpService.get<string>(url, {responseType: 'text'}),
    );
    const raw = response.data;

    let spec: any;
    try {
      spec = JSON.parse(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as JSON');
    } catch {
      this.logger.debug('Failed to parse as JSON, attempting YAML parse');
      spec = yamlLoad(raw);
      this.logger.debug('Successfully parsed OpenAPI spec as YAML');
    }

    const title: string = spec?.info?.title ?? '';
    const servers: Array<{ url: string }> = Array.isArray(spec?.servers)
      ? spec.servers
      : [];

    const serverUrl = servers.length > 0 ? servers[0].url : undefined;
    this.logger.debug(`Resolved spec title: ${title}, server URL: ${serverUrl}`);

    return IntrigSourceTransformResponse.from({
      id: '',
      name: title,
      specUrl: url,
      serverUrl: serverUrl,
    })
  }
}
