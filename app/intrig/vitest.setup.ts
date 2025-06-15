// This file contains setup code for Vitest tests

// Import Vitest globals
import { expect, vi } from 'vitest';

// Make Vitest's functions global to mimic Jest's globals
global.expect = expect;
global.vi = vi;

// Add Jest compatibility layer
global.jest = vi;
global.jest.fn = vi.fn;
global.jest.mock = vi.mock;
global.jest.spyOn = vi.spyOn;
global.jest.useFakeTimers = vi.useFakeTimers;
global.jest.useRealTimers = vi.useRealTimers;
global.jest.resetAllMocks = vi.resetAllMocks;
global.jest.clearAllMocks = vi.clearAllMocks;
global.jest.restoreAllMocks = vi.restoreAllMocks;

// Set up any global mocks or configurations needed for NestJS tests
