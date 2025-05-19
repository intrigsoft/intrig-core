import {ApiProperty} from '@nestjs/swagger';

export interface IIntrigSourceConfig {
  id: string;
  name: string;
  specUrl: string;
}

export class IntrigSourceConfig implements IIntrigSourceConfig {
  @ApiProperty({description: 'Unique identifier for the source config'})
  id: string;

  @ApiProperty({description: 'Name of the source config'})
  name: string;

  @ApiProperty({description: 'URL of the specification'})
  specUrl: string;

  constructor(id: string, name: string, specUrl: string) {
    this.id = id;
    this.name = name;
    this.specUrl = specUrl;
  }

  static from(source: IIntrigSourceConfig) {
    return new IntrigSourceConfig(source.id, source.name, source.specUrl);
  }
}