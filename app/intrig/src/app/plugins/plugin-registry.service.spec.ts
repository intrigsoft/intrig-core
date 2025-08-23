import { Test, TestingModule } from '@nestjs/testing';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginRegistryService', () => {
  let service: PluginRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginRegistryService],
    }).compile();

    service = module.get<PluginRegistryService>(PluginRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
