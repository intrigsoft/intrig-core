import { reactProviderInterfacesTemplate } from '../interfaces.template';
import { reactProviderReducerTemplate } from '../reducer.template';
import { reactProviderAxiosConfigTemplate } from '../axios-config.template';
import { reactIntrigProviderTemplate } from '../intrig-provider.template';
import { reactIntrigProviderStubTemplate } from '../intrig-provider-stub.template';
import { reactStatusTrapTemplate } from '../status-trap.template';
import { reactProviderHooksTemplate } from '../hooks.template';
import { reactProviderMainTemplate } from '../main.template';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

describe('Provider Templates', () => {
  const mockPath = '/tmp/test-intrig';
  const mockApisToSync = [
    { id: 'api1', name: 'API One' },
    { id: 'api2', name: 'API Two' }
  ];

  beforeAll(() => {
    // Create test directory structure
    if (!fs.existsSync(path.join(mockPath, 'src'))) {
      fs.mkdirSync(path.join(mockPath, 'src'), { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(mockPath)) {
      fs.rmSync(mockPath, { recursive: true, force: true });
    }
  });

  function validateTypeScriptSyntax(code: string, filename: string): void {
    const sourceFile = ts.createSourceFile(
      filename,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([filename], {
        noEmit: true,
        skipLibCheck: true,
        allowJs: false,
        strict: false,
      }, {
        getSourceFile: (fileName) => fileName === filename ? sourceFile : undefined,
        writeFile: () => { /* no-op for testing */ },
        getCurrentDirectory: () => '',
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => '',
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
      })
    );

    const syntaxErrors = diagnostics.filter(d => 
      d.category === ts.DiagnosticCategory.Error &&
      d.code >= 1000 && d.code < 2000 // Syntax error codes
    );

    if (syntaxErrors.length > 0) {
      const errorMessages = syntaxErrors.map(d => 
        `${d.messageText} (${d.code})`
      ).join('\n');
      throw new Error(`TypeScript syntax errors in ${filename}:\n${errorMessages}`);
    }
  }

  describe('reactProviderInterfacesTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactProviderInterfacesTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export interface DefaultConfigs');
      expect(result.content).toContain('export interface IntrigProviderProps');
      
      validateTypeScriptSyntax(result.content, 'interfaces.ts');
    });

    it('should include all API configurations in config type', () => {
      const result = reactProviderInterfacesTemplate(mockPath, mockApisToSync);
      expect(result.content).toContain('api1?: DefaultConfigs');
      expect(result.content).toContain('api2?: DefaultConfigs');
    });
  });

  describe('reactProviderReducerTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactProviderReducerTemplate(mockPath);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function requestReducer');
      expect(result.content).toContain('function inferNetworkReason');
      expect(result.content).toContain('function debounce');
      
      validateTypeScriptSyntax(result.content, 'reducer.ts');
    });
  });

  describe('reactProviderAxiosConfigTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function createAxiosInstance');
      expect(result.content).toContain('export function createAxiosInstances');
      
      validateTypeScriptSyntax(result.content, 'axios-config.ts');
    });

    it('should include axios instances for all APIs', () => {
      const result = reactProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      expect(result.content).toContain('api1: createAxiosInstance');
      expect(result.content).toContain('api2: createAxiosInstance');
    });
  });

  describe('reactIntrigProviderTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactIntrigProviderTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function IntrigProvider');
      
      validateTypeScriptSyntax(result.content, 'intrig-provider.tsx');
    });
  });

  describe('reactIntrigProviderStubTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactIntrigProviderStubTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function IntrigProviderStub');
      
      validateTypeScriptSyntax(result.content, 'intrig-provider-stub.tsx');
    });
  });

  describe('reactStatusTrapTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactStatusTrapTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function StatusTrap');
      
      validateTypeScriptSyntax(result.content, 'status-trap.tsx');
    });
  });

  describe('reactProviderHooksTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactProviderHooksTemplate(mockPath);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function useNetworkState');
      expect(result.content).toContain('export function useTransitionCall');
      expect(result.content).toContain('export function useCentralError');
      expect(result.content).toContain('export function useCentralPendingState');
      
      validateTypeScriptSyntax(result.content, 'provider-hooks.ts');
    });
  });

  describe('reactProviderMainTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = reactProviderMainTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export * from \'./interfaces\'');
      expect(result.content).toContain('export * from \'./reducer\'');
      expect(result.content).toContain('export * from \'./axios-config\'');
      expect(result.content).toContain('export * from \'./intrig-provider\'');
            expect(result.content).toContain('export * from \'./intrig-provider-stub\'');
            expect(result.content).toContain('export * from \'./status-trap\'');
      expect(result.content).toContain('export * from \'./provider-hooks\'');
      
      validateTypeScriptSyntax(result.content, 'intrig-provider.tsx');
    });
  });

  describe('Generated files integration', () => {
    it('should generate all files and maintain consistent exports', () => {
      const interfaces = reactProviderInterfacesTemplate(mockPath, mockApisToSync);
      const reducer = reactProviderReducerTemplate(mockPath);
      const axiosConfig = reactProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      const provider = reactIntrigProviderTemplate(mockPath, mockApisToSync);
            const providerStub = reactIntrigProviderStubTemplate(mockPath, mockApisToSync);
            const statusTrap = reactStatusTrapTemplate(mockPath, mockApisToSync);
      const hooks = reactProviderHooksTemplate(mockPath);
      const main = reactProviderMainTemplate(mockPath, mockApisToSync);

      // Verify all templates generate valid content
      expect(interfaces.content).toBeTruthy();
      expect(reducer.content).toBeTruthy();
      expect(axiosConfig.content).toBeTruthy();
      expect(provider.content).toBeTruthy();
            expect(providerStub.content).toBeTruthy();
            expect(statusTrap.content).toBeTruthy();
      expect(hooks.content).toBeTruthy();
      expect(main.content).toBeTruthy();

      // Verify main template re-exports all modules
      expect(main.content).toContain('IntrigProvider');
      expect(main.content).toContain('useNetworkState');
      expect(main.content).toContain('requestReducer');
      expect(main.content).toContain('createAxiosInstance');
      expect(main.content).toContain('DefaultConfigs');
    });
  });
});