import {IIntrigSourceConfig} from "./intrig-source-config";

export interface RestOptions {
  isConflictingVariablesAllowed?: boolean;
}

export interface CodeAnalyzerConfig {
  tsConfigPath?: string;
}

export interface IntrigConfig {
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;
  codeAnalyzer?: CodeAnalyzerConfig;
}

export class IntrigConfigImpl implements IntrigConfig {
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;
  codeAnalyzer?: CodeAnalyzerConfig;

  constructor(config: IntrigConfig) {
    this.sources = config.sources;
    this.generator = config.generator;
    this.restOptions = config.restOptions;
    this.codeAnalyzer = config.codeAnalyzer;
  }
}
