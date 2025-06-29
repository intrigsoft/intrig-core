export abstract class GeneratorBinding {
  abstract generateGlobal(...args: any[]): Promise<any>;
  abstract generateSource(...args: any[]): Promise<void>;
  abstract getLibName(): string;
  abstract postBuild(): Promise<void>;
  abstract getSchemaDocumentation(...args: any[]): Promise<any>;
  abstract getEndpointDocumentation(...args: any[]): Promise<any>;
  getRestOptions(): any { return {}; }
}
