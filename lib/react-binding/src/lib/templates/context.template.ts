import {IntrigSourceConfig, typescript} from "common";
import * as path from 'path'

export function reactContextTemplate(_path: string, apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve(_path, "src", "intrig-context.ts"))

  const configType = `{
  defaults?: DefaultConfigs,
  ${apisToSync.map(a => `${a.id}?: DefaultConfigs`).join(",\n  ")}
  }`

  return ts`
  import { NetworkAction, NetworkState } from '@intrig/react/network-state';
import { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { ZodSchema } from 'zod';
import { createContext, useContext, Dispatch } from 'react';
import { DefaultConfigs } from '@intrig/react/intrig-provider';

type GlobalState = Record<string, NetworkState>;

interface RequestType<T = any> extends AxiosRequestConfig {
  originalData?: T; // Keeps track of the original data type.
  key: string;
  source: string
}

/**
 * Defines the ContextType interface for managing global state, dispatching actions,
 * and holding a collection of Axios instances.
 *
 * @interface ContextType
 * @property {GlobalState} state - The global state of the application.
 * @property {Dispatch<NetworkAction<unknown>>} dispatch - The dispatch function to send network actions.
 * @property {Record<string, AxiosInstance>} axios - A record of Axios instances for making HTTP requests.
 */
export interface ContextType {
  state: GlobalState;
  filteredState: GlobalState;
  dispatch: Dispatch<NetworkAction<unknown, unknown>>;
  configs: ${configType};
  execute: <T>(request: RequestType, dispatch: (state: NetworkState<T>) => void, schema: ZodSchema<T> | undefined, errorSchema: ZodSchema<T> | undefined) => Promise<void>;
}

/**
 * Context object created using \`createContext\` function. Provides a way to share state, dispatch functions,
 * and axios instance across components without having to pass props down manually at every level.
 *
 * @type {ContextType}
 */
let Context = createContext<ContextType>({
  state: {},
  filteredState: {},
  dispatch() {},
  configs: {},
  async execute() {

  }
});

export function useIntrigContext() {
  return useContext(Context);
}

export {
  Context,
  GlobalState,
  RequestType,
}
`
}
