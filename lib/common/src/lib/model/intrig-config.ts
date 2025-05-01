import {IntrigSourceConfig} from "./intrig-config-source";

export interface RestOptions {

}

export interface IntrigConfig {
  sources: IntrigSourceConfig[];
  generator: 'react' | 'next';
  restOptions?: RestOptions;
}

export class IntrigConfigImpl implements IntrigConfig {
  sources: IntrigSourceConfig[];
  generator: 'react' | 'next';
  restOptions?: RestOptions;

  constructor(config: IntrigConfig) {
    this.sources = config.sources;
    this.generator = config.generator;
    this.restOptions = config.restOptions;
  }
}
