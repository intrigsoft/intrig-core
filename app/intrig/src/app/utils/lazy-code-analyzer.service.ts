import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntrigConfigService } from '../daemon/services/intrig-config.service';
import { CodeAnalyzer } from './code-analyzer';
import { ResourceDescriptor } from 'common';

@Injectable()
export class LazyCodeAnalyzerService {
  private codeAnalyzer: CodeAnalyzer | null = null;
  private readonly logger = new Logger(LazyCodeAnalyzerService.name);
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly intrigConfigService: IntrigConfigService
  ) {}

  private ensureInitialized(): CodeAnalyzer {
    if (this.codeAnalyzer && this.isInitialized) {
      return this.codeAnalyzer;
    }

    try {
      // This will throw if config file doesn't exist
      this.codeAnalyzer = new CodeAnalyzer(this.configService, this.intrigConfigService);
      this.isInitialized = true;
      this.logger.debug('CodeAnalyzer initialized successfully');
      return this.codeAnalyzer;
    } catch (error) {
      this.logger.warn(`Failed to initialize CodeAnalyzer: ${(error as Error).message}`);
      // Create a dummy analyzer that doesn't do anything
      this.codeAnalyzer = this.createDummyAnalyzer();
      this.isInitialized = true;
      return this.codeAnalyzer;
    }
  }

  private createDummyAnalyzer(): CodeAnalyzer {
    // Create a mock CodeAnalyzer that returns empty results
    const dummy = Object.create(CodeAnalyzer.prototype);
    dummy.setResourceDescriptors = () => { /* no-op */ };
    dummy.getResourceDescriptors = () => [];
    dummy.isEndpointUsed = () => false;
    dummy.isDataTypeUsed = () => false;
    dummy.getUsageStats = () => ({
      usedEndpoints: [],
      unusedEndpoints: [],
      usedDataTypes: [],
      unusedDataTypes: []
    });
    dummy.reindex = () => { /* no-op */ };
    dummy.clearAnalysisResults = () => { /* no-op */ };
    dummy.analyze = () => { /* no-op */ };
    dummy.getUsageCounts = () => ({ used: 0, total: 0 });
    dummy.getFileList = () => [];
    return dummy;
  }

  setResourceDescriptors(descriptors: ResourceDescriptor<any>[]): void {
    const analyzer = this.ensureInitialized();
    analyzer.setResourceDescriptors(descriptors);
  }

  getResourceDescriptors(): ResourceDescriptor<any>[] {
    const analyzer = this.ensureInitialized();
    return analyzer.getResourceDescriptors();
  }

  isEndpointUsed(endpointName: string, includeAsync = true): boolean {
    const analyzer = this.ensureInitialized();
    return analyzer.isEndpointUsed(endpointName, includeAsync);
  }

  isDataTypeUsed(typeName: string): boolean {
    const analyzer = this.ensureInitialized();
    return analyzer.isDataTypeUsed(typeName);
  }

  getUsageStats(): {
    usedEndpoints: string[],
    unusedEndpoints: string[],
    usedDataTypes: string[],
    unusedDataTypes: string[]
  } {
    const analyzer = this.ensureInitialized();
    return analyzer.getUsageStats();
  }

  reindex(sourceGlobs?: string[]): void {
    const analyzer = this.ensureInitialized();
    analyzer.reindex(sourceGlobs);
  }

  clearAnalysisResults(): void {
    const analyzer = this.ensureInitialized();
    analyzer.clearAnalysisResults();
  }

  analyze(sourceGlobs?: string[]): void {
    const analyzer = this.ensureInitialized();
    analyzer.analyze(sourceGlobs);
  }

  getUsageCounts(source: string, type: string): { used: number, total: number } {
    const analyzer = this.ensureInitialized();
    return analyzer.getUsageCounts(source, type);
  }

  getFileList(sourceId: string, type: string, id: string): string[] {
    const analyzer = this.ensureInitialized();
    return analyzer.getFileList(sourceId, type, id);
  }
}