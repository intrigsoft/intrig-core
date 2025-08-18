import {IntrigSourceConfig, typescript} from "common";
import * as path from 'path'

export function nextProviderInterfacesTemplate(_path: string, apisToSync: IntrigSourceConfig[]) {
  const configType = `{
  defaults?: DefaultConfigs,
  ${apisToSync.map(a => `${a.id}?: DefaultConfigs`).join(",\n  ")}
  }`

  const ts = typescript(path.resolve(_path, "src", "interfaces.ts"))
  return ts`import {
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {
  IntrigHook,
  NetworkState,
} from './network-state';
import { Context, RequestType, GlobalState, SchemaOf } from './intrig-context';

export interface DefaultConfigs extends CreateAxiosDefaults {
  debounceDelay?: number;
  requestInterceptor?: (
    config: InternalAxiosRequestConfig,
  ) => Promise<InternalAxiosRequestConfig>;
  responseInterceptor?: (
    config: AxiosResponse<any>,
  ) => Promise<AxiosResponse<any>>;
}

export interface IntrigProviderProps {
  configs?: ${configType};
  children: React.ReactNode;
}

export interface StubType {
  <P, B, T>(
    hook: IntrigHook<P, B, T>,
    fn: (
      params: P,
      body: B,
      dispatch: (state: NetworkState<T>) => void,
    ) => Promise<void>,
  ): void;
}

export type WithStubSupport<T> = T & {
  stubs?: (stub: StubType) => void;
};

export interface IntrigProviderStubProps {
  configs?: ${configType};
  stubs?: (stub: StubType) => void;
  children: React.ReactNode;
}

export interface StatusTrapProps {
  type: 'pending' | 'error' | 'pending + error';
  propagate?: boolean;
}

export interface NetworkStateProps<T> {
  key: string;
  operation: string;
  source: string;
  schema?: SchemaOf<T>;
  errorSchema?: SchemaOf<any>;
  debounceDelay?: number;
}
  `
}