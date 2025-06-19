import { Test, TestingModule } from '@nestjs/testing';
import { IntrigConfigService } from './intrig-config.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { IntrigConfig, IntrigSourceConfig } from 'common';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('IntrigConfigService', () => {
  let service: IntrigConfigService;
  let mockConfig: IntrigConfig;
  let mockSource: IntrigSourceConfig;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock data
    mockSource = {
      id: 'test-source',
      name: 'Test Source',
      specUrl: 'http://test.com'
    };

    mockConfig = {
      generator: "react",
      sources: [
        {
          id: 'existing-source',
          name: 'Existing Source',
          specUrl: 'http://existing.com'
        }
      ]
    };

    // Mock fs.readFileSync to return our mock config
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      return JSON.stringify(mockConfig);
    });

    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === 'rootDir') {
          return '/tmp';
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntrigConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntrigConfigService>(IntrigConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should read config file', () => {
    const config = service.get();
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/intrig.config.json', 'utf-8');
    expect(config).toEqual(mockConfig);
  });

  it('should add a source to config', () => {
    service.add(mockSource);
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/intrig.config.json', 'utf-8');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/intrig.config.json',
      expect.any(String)
    );

    // Verify the written config contains both sources
    const writtenConfig = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(writtenConfig.sources).toHaveLength(2);
    expect(writtenConfig.sources[1]).toEqual(mockSource);
  });

  it('should remove a source from config', () => {
    service.remove('existing-source');
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/intrig.config.json', 'utf-8');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/intrig.config.json',
      expect.any(String)
    );

    // Verify the written config has the source removed
    const writtenConfig = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(writtenConfig.sources).toHaveLength(0);
  });

  it('should list all sources', () => {
    const sources = service.list();
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/intrig.config.json', 'utf-8');
    expect(sources).toEqual(mockConfig.sources);
  });
});
