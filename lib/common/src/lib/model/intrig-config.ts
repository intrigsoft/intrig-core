import {IIntrigSourceConfig} from "./intrig-source-config";

export interface RestOptions {
  isConflictingVariablesAllowed?: boolean;
}

export interface CodeAnalyzerConfig {
  tsConfigPath?: string;
}

export interface IntrigConfig {
  $schema?: string;
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;
  codeAnalyzer?: CodeAnalyzerConfig;
  generatorOptions?: any;
}

export class IntrigConfigImpl implements IntrigConfig {
  $schema?: string;
  sources: IIntrigSourceConfig[];
  generator: string;
  restOptions?: RestOptions;
  codeAnalyzer?: CodeAnalyzerConfig;
  generatorOptions?: any;

  constructor(config: IntrigConfig) {
    this.$schema = config.$schema;
    this.sources = config.sources;
    this.generator = config.generator;
    this.restOptions = config.restOptions;
    this.codeAnalyzer = config.codeAnalyzer;
    this.generatorOptions = config.generatorOptions;
  }
}
