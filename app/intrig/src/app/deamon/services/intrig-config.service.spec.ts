import { Test, TestingModule } from '@nestjs/testing';
import { IntrigConfigService } from './intrig-config.service';
import { ConfigService } from '@nestjs/config';

describe('ConfigService', () => {
  let service: IntrigConfigService;

  beforeEach(async () => {
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
});
