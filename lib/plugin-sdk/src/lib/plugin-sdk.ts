import type {OpenAPIV3_1} from "openapi-types";
import type {JSONSchema7} from "json-schema";

export type IntrigVersion = `^${number}.${number}.${number}`;

type PackageOverride = {
  [key: string]: string | PackageOverride;
};

export interface PackageJson {
  name: string;
  version: string;
  license?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  type?: 'module' | 'commonjs';
  main?: string;
  types?: string;
  typings?: string;
  module?: string;
  exports?: string | Record<string, string | {
    types?: string;
    require?: string;
    import?: string;
    development?: string;
    default?: string;
  }>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, {
    optional: boolean;
  }>;
  resolutions?: Record<string, string>;
  pnpm?: {
    overrides?: PackageOverride;
  };
  overrides?: PackageOverride;
  bin?: Record<string, string> | string;
  workspaces?: string[] | {
    packages: string[];
  };
  publishConfig?: Record<string, string>;
  files?: string[];
  generators?: string;
  schematics?: string;
  builders?: string;
  executors?: string;
  packageManager?: string;
  description?: string;
  keywords?: string[];
}

export interface IntrigSourceConfig {
  id: string
  name: string
  specUrl: string
}

export interface ResourceDescriptor<T> {
  id: string
  name: string
  type: string
  source: string
  path: string
  data: T
  lastAccessed?: number
}

export interface CompiledContent {
  path: string;
  content: string;
}

export type RestData = {
  method: string;
  paths: string[];
  operationId: string;
  requestBody?: string;
  contentType?: string;
  response?: string;
  responseHeaders?: Record<string, string>;
  responseType?: string;
  requestUrl?: string;
  variables?: Variable[];
  description?: string;
  summary?: string;
  responseExamples?: Record<string, string>;
  errorResponses?: Record<string, ErrorResponse>;
  isDownloadable?: boolean;
};

export interface Schema {
  name: string;
  schema: OpenAPIV3_1.SchemaObject;
}

export type Variable = { name: string; in: string; ref: string };
export type ErrorResponse = { response?: string; responseType?: string };
export type RelatedType = { name: string; id: string };
export type Tab = { name: string; content: string };

export interface GeneratorContext {
  sources: IntrigSourceConfig[],
  restDescriptors: ResourceDescriptor<RestData>[],
  schemaDescriptors: ResourceDescriptor<Schema>[],
  dump(content: Promise<CompiledContent>): Promise<void>
  rootDir?: string
}

export interface InitContext<GeneratorOptions> {
  options: GeneratorOptions;
  rootDir: string;
  buildDir: string;
  dump(content: Promise<CompiledContent>): Promise<void>;
}

export interface PostBuildContext<GeneratorOptions> {
  options: GeneratorOptions;
  buildDir: string;
  rootDir: string;
}

export interface PreBuildContext<GeneratorOptions> {
  options: GeneratorOptions;
  buildDir: string;
  rootDir: string;
}

export interface AddSourceContext<GeneratorOptions> {
  options: GeneratorOptions;
  rootDir: string;
  source: IntrigSourceConfig;
  serverUrl?: string;
}

export interface RemoveSourceContext<GeneratorOptions> {
  options: GeneratorOptions;
  rootDir: string;
  source: IntrigSourceConfig;
  serverUrl?: string;
}

export class StatsCounter {
  public counters: Record<string, number> = {};
  constructor(public readonly sourceId: string) {
  }

  inc(key: string) {
    this.counters[key] = (this.counters[key] || 0) + 1;
  }
}

export interface IntrigGeneratorPlugin<GeneratorOptions> {
  $generatorSchema?: JSONSchema7;
  meta(): { name: string; version: string; compat: IntrigVersion; displayName?: string; generator: string };
  generate(ctx: GeneratorContext): Promise<StatsCounter[]>;
  getSchemaDocumentation(result: ResourceDescriptor<Schema>): Promise<Tab[]>;
  getEndpointDocumentation(result: ResourceDescriptor<RestData>): Promise<Tab[]>;
  init?: (ctx: InitContext<GeneratorOptions>) => Promise<void>;
  postBuild?: (ctx: PostBuildContext<GeneratorOptions>) => Promise<void>;
  preBuild?: (ctx: PreBuildContext<GeneratorOptions>) => Promise<void>;
  addSource?: (ctx: AddSourceContext<GeneratorOptions>) => Promise<void>;
  removeSource?: (ctx: RemoveSourceContext<GeneratorOptions>) => Promise<void>;
}