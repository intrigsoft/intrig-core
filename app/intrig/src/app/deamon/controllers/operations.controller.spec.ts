import { Test, TestingModule } from '@nestjs/testing';
import { OperationsController } from './operations.controller';

// Add console logs for debugging
console.log('[DEBUG] Starting OperationsController test');

describe('OperationsController', () => {
  let controller: OperationsController;

  beforeEach(async () => {
    try {
      console.log('[DEBUG] Creating testing module');
      const module: TestingModule = await Test.createTestingModule({
        controllers: [OperationsController],
      }).compile();

      controller = module.get<OperationsController>(OperationsController);
      console.log('[DEBUG] Controller created successfully');
    } catch (error) {
      console.error('[DEBUG] Error in beforeEach:', error);
      throw error;
    }
  });

  it('should be defined', () => {
    try {
      console.log('[DEBUG] Running test: should be defined');
      expect(controller).toBeDefined();
      console.log('[DEBUG] Test completed successfully');
    } catch (error) {
      console.error('[DEBUG] Test error:', error);
      throw error;
    }
  });
});
