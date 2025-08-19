import { Test, TestingModule } from '@nestjs/testing';
import { DataSearchController } from './data-search.controller';

describe('DataSearchController', () => {
  let controller: DataSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataSearchController],
    }).compile();

    controller = module.get<DataSearchController>(DataSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
