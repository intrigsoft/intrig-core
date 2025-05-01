import { Test } from '@nestjs/testing';
import { IntrigReactBindingService } from './react-binding.service';

describe('IntrigReactBindingService', () => {
  let service: IntrigReactBindingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [IntrigReactBindingService],
    }).compile();

    service = module.get(IntrigReactBindingService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
