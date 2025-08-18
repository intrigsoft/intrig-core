import {IntrigSourceConfig, typescript} from "common";
import * as path from 'path'

export function reactProviderMainTemplate(_path: string, apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve(_path, "src", "intrig-provider.tsx"))
  return ts`// Re-export all provider functionality from modular templates
export * from './interfaces';
export * from './reducer';
export * from './axios-config';
export * from './provider-components';
export * from './provider-hooks';

// Main provider exports for backward compatibility
export {
  IntrigProvider,
  IntrigProviderStub,
  StatusTrap,
} from './provider-components';

export {
  useNetworkState,
  useTransitionCall,
  useCentralError,
  useCentralPendingState,
} from './provider-hooks';

export {
  requestReducer,
  inferNetworkReason,
  debounce,
} from './reducer';

export {
  createAxiosInstance,
  createAxiosInstances,
} from './axios-config';

export type {
  DefaultConfigs,
  IntrigProviderProps,
  IntrigProviderStubProps,
  StatusTrapProps,
  NetworkStateProps,
  StubType,
  WithStubSupport,
} from './interfaces';
  `
}