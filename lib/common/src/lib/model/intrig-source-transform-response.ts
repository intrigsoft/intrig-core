import {ApiProperty} from '@nestjs/swagger';
import {IIntrigSourceConfig} from './intrig-source-config';

export interface IIntrigSourceTransformResponse extends IIntrigSourceConfig {
  serverUrl?: string;
}

export class IntrigSourceTransformResponse implements IIntrigSourceTransformResponse {
  @ApiProperty({description: 'Unique identifier for the source config'})
  id: string;

  @ApiProperty({description: 'Name of the source config'})
  name: string;

  @ApiProperty({description: 'URL of the specification'})
  specUrl: string;

  @ApiProperty({description: 'Resolved server URL from the OpenAPI spec', required: false})
  serverUrl?: string;

  constructor(id: string, name: string, specUrl: string, serverUrl?: string) {
    this.id = id;
    this.name = name;
    this.specUrl = specUrl;
    this.serverUrl = serverUrl;
  }

  static from(source: IIntrigSourceTransformResponse) {
    return new IntrigSourceTransformResponse(source.id, source.name, source.specUrl, source.serverUrl);
  }
}