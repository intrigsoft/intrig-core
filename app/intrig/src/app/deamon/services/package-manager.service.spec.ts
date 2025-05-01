import { Test, TestingModule } from '@nestjs/testing';
import { PackageManagerService } from './package-manager.service';

describe('PackageManagerService', () => {
  let service: PackageManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PackageManagerService],
    }).compile();

    service = module.get<PackageManagerService>(PackageManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
