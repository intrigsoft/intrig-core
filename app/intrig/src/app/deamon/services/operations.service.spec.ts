import { Test, TestingModule } from '@nestjs/testing';
import { OperationsService } from './operations.service';
import { IntrigOpenapiService } from 'openapi-source';
import { IntrigConfigService } from './intrig-config.service';
import { GeneratorBinding, IntrigConfig, IntrigSourceConfig, PackageManagerService, ResourceDescriptor, RestData, Schema } from 'common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  pathExistsSync: jest.fn(),
  readdir: jest.fn(),
  remove: jest.fn(),
  ensureDirSync: jest.fn(),
  pathExists: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
}));

describe('OperationsService', () => {
  let service: OperationsService;
  let mockOpenApiService: any;
  let mockConfigService: any;
  let mockGeneratorBinding: any;
  let mockPackageManagerService: any;
  let mockConfig: any;
  let mockSearchService: any;
  let mockIntrigConfig: IntrigConfig;
  let mockSourceConfig: IntrigSourceConfig;
  let mockDescriptors: ResourceDescriptor<RestData | Schema>[];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock data
    mockIntrigConfig = {
      sources: [
        {
          id: 'test-source',
          type: 'test',
          name: 'Test Source',
          url: 'http://test.com'
        }
      ]
    };

    mockSourceConfig = {
      id: 'test-source',
      type: 'test',
      name: 'Test Source',
      url: 'http://test.com'
    };

    mockDescriptors = [
      {
        id: 'descriptor-1',
        name: 'Descriptor 1',
        sourceId: 'test-source',
        type: 'rest',
        data: { path: '/test', method: 'GET' } as RestData
      },
      {
        id: 'descriptor-2',
        name: 'Descriptor 2',
        sourceId: 'test-source',
        type: 'schema',
        data: { type: 'object' } as Schema
      }
    ];

    mockOpenApiService = {
      sync: jest.fn(),
      getResourceDescriptors: jest.fn().mockResolvedValue(mockDescriptors),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(mockIntrigConfig),
    };

    mockGeneratorBinding = {
      postBuild: jest.fn(),
      getRestOptions: jest.fn().mockReturnValue({}),
      getLibName: jest.fn().mockReturnValue('test-lib'),
      generateGlobal: jest.fn(),
      generateSource: jest.fn(),
    };

    mockPackageManagerService = {
      build: jest.fn(),
      install: jest.fn(),
      installDependency: jest.fn(),
    };

    mockConfig = {
      get: jest.fn((key) => {
        if (key === 'generatedDir') {
          return '/tmp/generated';
        }
        if (key === 'rootDir') {
          return '/tmp';
        }
        return undefined;
      }),
    };

    mockSearchService = {
      addDescriptor: jest.fn(),
      removeDescriptor: jest.fn(),
    };

    // Setup fs-extra mocks
    (fs.pathExistsSync as jest.Mock).mockReturnValue(true);
    (fs.readdir as jest.Mock).mockResolvedValue(['file1', 'file2']);
    (fs.remove as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDirSync as jest.Mock).mockReturnValue(undefined);
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.copy as jest.Mock).mockResolvedValue(undefined);
    (fs.readJson as jest.Mock).mockResolvedValue({ dependencies: {}, devDependencies: {} });
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsService,
        { provide: IntrigOpenapiService, useValue: mockOpenApiService },
        { provide: IntrigConfigService, useValue: mockConfigService },
        { provide: GeneratorBinding, useValue: mockGeneratorBinding },
        { provide: PackageManagerService, useValue: mockPackageManagerService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    service = module.get<OperationsService>(OperationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get config', async () => {
    const result = await service.getConfig({});
    expect(mockConfigService.get).toHaveBeenCalled();
    expect(result).toEqual(mockIntrigConfig);
  });

  it('should sync sources', async () => {
    await service.sync({});
    expect(mockConfigService.get).toHaveBeenCalled();
    expect(mockOpenApiService.sync).toHaveBeenCalled();
    expect(mockOpenApiService.getResourceDescriptors).toHaveBeenCalled();
    expect(mockSearchService.addDescriptor).toHaveBeenCalled();
  });

  it('should sync specific source', async () => {
    await service.sync({}, 'test-source');
    expect(mockConfigService.get).toHaveBeenCalled();
    expect(mockOpenApiService.sync).toHaveBeenCalledWith(
      expect.objectContaining({ sources: expect.any(Array) }),
      'test-source',
      expect.any(Object)
    );
  });

  it('should generate content', async () => {
    // Mock fs.pathExistsSync for clearGenerateDir
    (fs.pathExistsSync as jest.Mock).mockReturnValue(true);

    await service.generate({});

    expect(mockConfigService.get).toHaveBeenCalled();
    expect(mockOpenApiService.getResourceDescriptors).toHaveBeenCalled();
    expect(mockGeneratorBinding.generateSource).toHaveBeenCalled();
    expect(mockGeneratorBinding.generateGlobal).toHaveBeenCalled();
    expect(mockPackageManagerService.install).toHaveBeenCalled();
    expect(mockPackageManagerService.build).toHaveBeenCalled();
    expect(mockGeneratorBinding.postBuild).toHaveBeenCalled();

    // Verify file operations
    expect(fs.pathExistsSync).toHaveBeenCalled();
    expect(fs.readdir).toHaveBeenCalled();
    expect(fs.remove).toHaveBeenCalled();
    expect(fs.ensureDirSync).toHaveBeenCalled();
    expect(fs.pathExists).toHaveBeenCalled();
    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.copy).toHaveBeenCalled();
    expect(fs.readJson).toHaveBeenCalled();
    expect(fs.writeJson).toHaveBeenCalled();
  });
});
