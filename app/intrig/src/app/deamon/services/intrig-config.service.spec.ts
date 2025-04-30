import { Test, TestingModule } from '@nestjs/testing';
import { IntrigConfigService } from './intrig-config.service';

describe('ConfigService', () => {
  let service: IntrigConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntrigConfigService],
    }).compile();

    service = module.get<IntrigConfigService>(IntrigConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
