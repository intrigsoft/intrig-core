import {IIntrigSourceConfig} from "./intrig-source-config";

export interface RestOptions {
  isConflictingVariablesAllowed?: boolean;
}

export interface IntrigConfig {
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;
}

export class IntrigConfigImpl implements IntrigConfig {
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;

  constructor(config: IntrigConfig) {
    this.sources = config.sources;
    this.generator = config.generator;
    this.restOptions = config.restOptions;
  }
}
