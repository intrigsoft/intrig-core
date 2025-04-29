import { Test, TestingModule } from '@nestjs/testing';
import { Openapi3Service } from './openapi3.service';

describe('Openapi3Service', () => {
  let service: Openapi3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Openapi3Service],
    }).compile();

    service = module.get<Openapi3Service>(Openapi3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
