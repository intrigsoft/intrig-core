export interface IntrigSourceConfig {
  id: string;
  name: string;
  specUrl: string;
  regex?: string;
}

export class IntrigConfigSource implements IntrigSourceConfig {
  id: string;
  name: string;
  specUrl: string;
  regex?: string;

  constructor(id: string, name: string, specUrl: string, regex?: string) {
    this.id = id;
    this.name = name;
    this.specUrl = specUrl;
    this.regex = regex;
  }

  static from(source: IntrigSourceConfig) {
    return new IntrigConfigSource(source.id, source.name, source.specUrl, source.regex);
  }
}