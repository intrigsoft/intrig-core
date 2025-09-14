import {IntrigSourceConfig, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function providerMainTemplate(apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve("src", "intrig-provider-main.tsx"))
  return ts`// Re-export all provider functionality from modular templates
export * from './interfaces';
export * from './reducer';
export * from './axios-config';
export * from './intrig-provider';
export * from './intrig-provider-stub';
export * from './status-trap';
export * from './provider-hooks';

// Main provider exports for backward compatibility
export { IntrigProvider } from './intrig-provider';
export { IntrigProviderStub } from './intrig-provider-stub';
export { StatusTrap } from './status-trap';

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