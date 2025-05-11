import { Test, TestingModule } from '@nestjs/testing';
import { DataSearchService } from './data-search.service';

describe('DataSearchService', () => {
  let service: DataSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataSearchService],
    }).compile();

    service = module.get<DataSearchService>(DataSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
