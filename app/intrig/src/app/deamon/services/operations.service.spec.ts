import { Test, TestingModule } from '@nestjs/testing';
import { OperationsService } from './operations.service';
import { IntrigOpenapiService } from 'openapi-source';
import { IntrigConfigService } from './intrig-config.service';
import { GeneratorBinding, PackageManagerService } from 'common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';

describe('OperationsService', () => {
  let service: OperationsService;

  beforeEach(async () => {
    const mockOpenApiService = {
      sync: jest.fn(),
      getResourceDescriptors: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockGeneratorBinding = {
      postBuild: jest.fn(),
    };

    const mockPackageManagerService = {};

    const mockConfig = {
      get: jest.fn((key) => {
        if (key === 'generatedDir') {
          return '/tmp/generated';
        }
        return undefined;
      }),
    };

    const mockSearchService = {
      addDescriptor: jest.fn(),
      removeDescriptor: jest.fn(),
    };

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
});
