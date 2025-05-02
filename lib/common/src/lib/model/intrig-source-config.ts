export interface IIntrigSourceConfig {
  id: string;
  name: string;
  specUrl: string;
}

export class IntrigSourceConfig implements IIntrigSourceConfig {
  id: string;
  name: string;
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