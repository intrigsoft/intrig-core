import { nextProviderInterfacesTemplate } from '../interfaces.template';
import { nextProviderReducerTemplate } from '../reducer.template';
import { nextProviderAxiosConfigTemplate } from '../axios-config.template';
import { nextProviderComponentsTemplate } from '../components.template';
import { nextProviderHooksTemplate } from '../hooks.template';
import { nextProviderMainTemplate } from '../main.template';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

describe('Next.js Provider Templates', () => {
  const mockPath = '/tmp/test-intrig-next';
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
      filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([filename], {
        noEmit: true,
        skipLibCheck: true,
        allowJs: false,
        strict: false,
        jsx: ts.JsxEmit.React,
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

  describe('nextProviderInterfacesTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = nextProviderInterfacesTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export interface DefaultConfigs');
      expect(result.content).toContain('export interface IntrigProviderProps');
      
      validateTypeScriptSyntax(result.content, 'interfaces.ts');
    });

    it('should include all API configurations in config type', () => {
      const result = nextProviderInterfacesTemplate(mockPath, mockApisToSync);
      expect(result.content).toContain('api1?: DefaultConfigs');
      expect(result.content).toContain('api2?: DefaultConfigs');
    });
  });

  describe('nextProviderReducerTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = nextProviderReducerTemplate(mockPath);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function requestReducer');
      expect(result.content).toContain('function inferNetworkReason');
      expect(result.content).toContain('function debounce');
      
      validateTypeScriptSyntax(result.content, 'reducer.ts');
    });
  });

  describe('nextProviderAxiosConfigTemplate', () => {
    it('should generate syntactically valid TypeScript code', () => {
      const result = nextProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('export function createAxiosInstance');
      expect(result.content).toContain('export function createAxiosInstances');
      
      validateTypeScriptSyntax(result.content, 'axios-config.ts');
    });

    it('should include axios instances for all APIs', () => {
      const result = nextProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      expect(result.content).toContain('api1: createAxiosInstance');
      expect(result.content).toContain('api2: createAxiosInstance');
    });
  });

  describe('nextProviderComponentsTemplate', () => {
    it('should generate syntactically valid TypeScript code with "use client" directive', () => {
      const result = nextProviderComponentsTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('"use client"');
      expect(result.content).toContain('export function IntrigProvider');
      expect(result.content).toContain('export function IntrigProviderStub');
      expect(result.content).toContain('export function StatusTrap');
      
      validateTypeScriptSyntax(result.content, 'provider-components.tsx');
    });
  });

  describe('nextProviderHooksTemplate', () => {
    it('should generate syntactically valid TypeScript code with "use client" directive', () => {
      const result = nextProviderHooksTemplate(mockPath);
      expect(result).toBeDefined();
      expect(result.content).toContain('"use client"');
      expect(result.content).toContain('export function useNetworkState');
      expect(result.content).toContain('export function useTransitionCall');
      expect(result.content).toContain('export function useCentralError');
      expect(result.content).toContain('export function useCentralPendingState');
      
      validateTypeScriptSyntax(result.content, 'provider-hooks.ts');
    });
  });

  describe('nextProviderMainTemplate', () => {
    it('should generate syntactically valid TypeScript code with "use client" directive', () => {
      const result = nextProviderMainTemplate(mockPath, mockApisToSync);
      expect(result).toBeDefined();
      expect(result.content).toContain('"use client"');
      expect(result.content).toContain('export * from \'./interfaces\'');
      expect(result.content).toContain('export * from \'./reducer\'');
      expect(result.content).toContain('export * from \'./axios-config\'');
      expect(result.content).toContain('export * from \'./provider-components\'');
      expect(result.content).toContain('export * from \'./provider-hooks\'');
      
      validateTypeScriptSyntax(result.content, 'intrig-provider.tsx');
    });
  });

  describe('Generated files integration', () => {
    it('should generate all files and maintain consistent exports for Next.js', () => {
      const interfaces = nextProviderInterfacesTemplate(mockPath, mockApisToSync);
      const reducer = nextProviderReducerTemplate(mockPath);
      const axiosConfig = nextProviderAxiosConfigTemplate(mockPath, mockApisToSync);
      const components = nextProviderComponentsTemplate(mockPath, mockApisToSync);
      const hooks = nextProviderHooksTemplate(mockPath);
      const main = nextProviderMainTemplate(mockPath, mockApisToSync);

      // Verify all templates generate valid content
      expect(interfaces.content).toBeTruthy();
      expect(reducer.content).toBeTruthy();
      expect(axiosConfig.content).toBeTruthy();
      expect(components.content).toBeTruthy();
      expect(hooks.content).toBeTruthy();
      expect(main.content).toBeTruthy();

      // Verify main template re-exports all modules
      expect(main.content).toContain('IntrigProvider');
      expect(main.content).toContain('useNetworkState');
      expect(main.content).toContain('requestReducer');
      expect(main.content).toContain('createAxiosInstance');
      expect(main.content).toContain('DefaultConfigs');

      // Verify Next.js specific "use client" directives
      expect(components.content).toContain('"use client"');
      expect(hooks.content).toContain('"use client"');
      expect(main.content).toContain('"use client"');
    });
  });
});