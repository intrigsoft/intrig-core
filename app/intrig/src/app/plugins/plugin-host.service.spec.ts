import { Test, TestingModule } from '@nestjs/testing';
import { PluginHostService } from './plugin-host.service';
import { ConfigService } from '@nestjs/config';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginHostService', () => {
  let service: PluginHostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginHostService,
        PluginRegistryService,
        { provide: ConfigService, useValue: new ConfigService() },
      ],
    }).compile();

    service = module.get<PluginHostService>(PluginHostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
