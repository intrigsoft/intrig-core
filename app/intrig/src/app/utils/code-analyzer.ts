import { Project, SyntaxKind, Node } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntrigConfigService } from '../deamon/services/intrig-config.service';
import { ResourceDescriptor } from 'common';

/**
 * CodeAnalyzer class for analyzing TypeScript code to find endpoint and data-type usage
 */
@Injectable()
export class CodeAnalyzer {
  private readonly logger = new Logger(CodeAnalyzer.name);
  private project: Project;

  private sourceUsageMap: Map<string, Set<string>> = new Map();
  private dataTypeUsageMap: Map<string, Map<string, Set<string>>> = new Map<string, Map<string, Set<string>>>();
  private controllerUsageMap: Map<string, Map<string, Set<string>>> = new Map<string, Map<string, Set<string>>>();
  private endpointUsageMap: Map<string, Map<string, Set<string>>> = new Map<string, Map<string, Set<string>>>();

  // Current list of resource descriptors
  private currentDescriptors: ResourceDescriptor<any>[] = [];

  /**
   * Creates a new CodeAnalyzer instance
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly intrigConfigService: IntrigConfigService
  ) {
    const projectRootPath = process.cwd();
    const config = this.intrigConfigService.get();
    const tsConfigPath = config.codeAnalyzer?.tsConfigPath || 'tsconfig.json';

    this.project = new Project({
      tsConfigFilePath: path.join(projectRootPath, tsConfigPath),
    });
  }

  /**
   * Set the current list of resource descriptors
   * @param descriptors List of resource descriptors to analyze against
   */
  public setResourceDescriptors(descriptors: ResourceDescriptor<any>[]): void {
    this.logger.debug(`Setting ${descriptors.length} resource descriptors for analysis`);
    this.currentDescriptors = descriptors;
  }

  /**
   * Get the current list of resource descriptors
   */
  public getResourceDescriptors(): ResourceDescriptor<any>[] {
    return this.currentDescriptors;
  }

  /**
   * Check if an endpoint is used in the codebase
   * @param endpointName The name of the endpoint to check
   * @param includeAsync Whether to check async variants as well
   */
  public isEndpointUsed(endpointName: string, includeAsync = true): boolean {
    return this.endpointUsageMap.has(endpointName);
  }

  /**
   * Check if a data type is used in the codebase
   * @param typeName The name of the data type to check
   */
  public isDataTypeUsed(typeName: string): boolean {
    return this.dataTypeUsageMap.has(typeName);
  }

  /**
   * Get usage statistics for the current resource descriptors
   */
  public getUsageStats(): {
    usedEndpoints: string[],
    unusedEndpoints: string[],
    usedDataTypes: string[],
    unusedDataTypes: string[]
  } {
    const usedEndpoints: string[] = [];
    const unusedEndpoints: string[] = [];
    const usedDataTypes: string[] = [];
    const unusedDataTypes: string[] = [];

    // Process endpoints
    const endpointDescriptors = this.currentDescriptors.filter(d => d.type === 'rest');
    endpointDescriptors.forEach(descriptor => {
      const name = descriptor.name;
      if (this.isEndpointUsed(name)) {
        usedEndpoints.push(name);
      } else {
        unusedEndpoints.push(name);
      }
    });

    // Process data types
    const dataTypeDescriptors = this.currentDescriptors.filter(d => d.type === 'schema');
    dataTypeDescriptors.forEach(descriptor => {
      const name = descriptor.name;
      if (this.isDataTypeUsed(name)) {
        usedDataTypes.push(name);
      } else {
        unusedDataTypes.push(name);
      }
    });

    return {
      usedEndpoints,
      unusedEndpoints,
      usedDataTypes,
      unusedDataTypes
    };
  }

  /**
   * Trigger reindexing of the codebase
   * @param sourceGlobs Optional glob patterns to limit the analysis to specific files
   */
  public reindex(sourceGlobs: string[] = ['**/*.ts', '**/*.tsx']): void {
    this.logger.debug(`Reindexing codebase with patterns: ${sourceGlobs.join(', ')}`);

    // Clear previous analysis results
    this.clearAnalysisResults();

    // Perform the analysis
    this.analyze(sourceGlobs);
  }

  /**
   * Clear all analysis results
   */
  private clearAnalysisResults(): void {
    this.sourceUsageMap.clear();
    this.dataTypeUsageMap.clear();
    this.controllerUsageMap.clear();
    this.endpointUsageMap.clear();
  }

  /**
   * Analyze the project to find endpoint and data-type usage
   * @param sourceGlobs Optional glob patterns to limit the analysis to specific files
   */
  private analyze(sourceGlobs: string[] = ['**/*.ts', '**/*.tsx']): void {
    // Add source files to the project
    sourceGlobs.forEach(glob => {
      this.project.addSourceFilesAtPaths(glob);
    });

    // Process each source file
    const sourceFiles = this.project.getSourceFiles();
    sourceFiles.forEach(sourceFile => {

      sourceFile.getImportDeclarations()
        .map(importDecl => importDecl.getModuleSpecifier()?.getText().slice(1, -1).split('/'))
        .filter(path => path[0] === '@intrig' && path?.length > 4)
        .forEach(_path => {
          const source = _path[2];
          if (!this.sourceUsageMap.has(source)) {
            this.sourceUsageMap.set(source, new Set<string>())
          }
          const filePath = path.relative(this.configService.get('rootDir') ?? process.cwd(), sourceFile.getFilePath())
          this.sourceUsageMap.get(source)?.add(filePath)

          if (_path[3] === 'components') {
            const dataType = _path?.pop() ?? '';
            if (!this.dataTypeUsageMap.has(source)) {
              this.dataTypeUsageMap.set(source, new Map<string, Set<string>>())
            }
            if (!this.dataTypeUsageMap.get(source)?.has(dataType)) {
              this.dataTypeUsageMap.get(source)?.set(dataType, new Set<string>())
            }
            this.dataTypeUsageMap.get(source)?.get(dataType)?.add(filePath)
          } else {
            const controller = _path[3]
            if (!this.controllerUsageMap.has(source)) {
              this.controllerUsageMap.set(source, new Map<string, Set<string>>())
            }
            if (!this.controllerUsageMap.get(source)?.has(controller)) {
              this.controllerUsageMap.get(source)?.set(controller, new Set<string>())
            }
            this.controllerUsageMap.get(source)?.get(controller)?.add(filePath)

            const endpointName = _path[4]
            if (!this.endpointUsageMap.has(source)) {
              this.endpointUsageMap.set(source, new Map<string, Set<string>>())
            }
            if (!this.endpointUsageMap.get(source)?.has(endpointName)) {
              this.endpointUsageMap.get(source)?.set(endpointName, new Set<string>())
            }
            this.endpointUsageMap.get(source)?.get(endpointName)?.add(filePath)
          }
        })
    });
  }

  /**
   * Get the count of resources that match the specified filters
   * @param source Optional source to filter by
   * @param type Optional type to filter by ('rest' or 'schema')
   * @returns The count of resources that match the filters
   */
  public getUsageCounts(source?: string, type?: string): number {
    this.logger.debug(`Getting usage counts with filters - source: ${source || 'all'}, type: ${type || 'all'}`);

    switch (type) {
      case 'source':
        if (source) {
          return this.sourceUsageMap.get(source)?.size ?? 0;
        }
        return this.sourceUsageMap.size;
      case 'controller':
        if (source) {
          return this.controllerUsageMap.get(source)?.size ?? 0;
        }
        return [...this.controllerUsageMap.values()].reduce((acc, val) => acc + val.size, 0) ?? 0;
      case 'endpoint':
        if (source) {
          return this.endpointUsageMap.get(source)?.size ?? 0;
        }
        return [...this.endpointUsageMap.values()].reduce((acc, val) => acc + val.size, 0) ?? 0;
      case 'datatype':
        if (source) {
          return this.dataTypeUsageMap.get(source)?.size ?? 0;
        }
        return [...this.dataTypeUsageMap.values()].reduce((acc, val) => acc + val.size, 0) ?? 0;
      default:
        return 0;
    }
  }

  /**
   * Get the list of files where a specific endpoint or datatype is used
   * @param sourceId The source identifier
   * @param type The type ('endpoint' or 'datatype')
   * @param id The endpoint or datatype identifier
   * @returns Array of file paths where the endpoint or datatype is used
   */
  public getFileList(sourceId: string, type: 'endpoint' | 'datatype', id: string): string[] {
    this.logger.debug(`Getting file list for ${type} '${id}' in source '${sourceId}'`);

    const name = this.getResourceDescriptors().find(d => d.id === id)?.name ?? '';

    if (type === 'endpoint') {
      return Array.from(this.endpointUsageMap.get(sourceId)?.get(name) || []);
    } else if (type === 'datatype') {
      return Array.from(this.dataTypeUsageMap.get(sourceId)?.get(name) || []);
    }
    
    return [];
  }
}