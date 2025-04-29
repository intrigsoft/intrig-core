import {IntrigSourceConfig} from "./intrig-config-source";

export interface IntrigConfig {
  addToGitOnUpdate?: boolean;
  rejectUnauthorized?: boolean;
  emptyBodyTypeOnPost?: "unknown" | "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined";
  sources: IntrigSourceConfig[];
  generator: 'react' | 'next';
}

export class IntrigConfigImpl implements IntrigConfig {
  addToGitOnUpdate?: boolean;
  rejectUnauthorized?: boolean;
  emptyBodyTypeOnPost?: "unknown" | "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined";
  sources: IntrigSourceConfig[];
  generator: 'react' | 'next';

  constructor(config: IntrigConfig) {
    this.addToGitOnUpdate = config.addToGitOnUpdate;
    this.rejectUnauthorized = config.rejectUnauthorized;
    this.emptyBodyTypeOnPost = config.emptyBodyTypeOnPost;
    this.sources = config.sources;
    this.generator = config.generator;
  }
}
