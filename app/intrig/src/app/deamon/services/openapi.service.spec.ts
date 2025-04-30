import { Test, TestingModule } from '@nestjs/testing';
import { OpenapiService } from './openapi.service';

describe('OpenapiService', () => {
  let service: OpenapiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenapiService],
    }).compile();

    service = module.get<OpenapiService>(OpenapiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
