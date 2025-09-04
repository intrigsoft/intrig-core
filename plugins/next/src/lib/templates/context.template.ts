import {IntrigSourceConfig, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function contextTemplate(apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve("src", "intrig-context.ts"))

  const configType = `{
  defaults?: DefaultConfigs,
  ${apisToSync.map(a => `${a.id}?: DefaultConfigs`).join(",\n  ")}
  }`

  return ts`
import { NetworkAction, NetworkState } from '@intrig/react/network-state';
import { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { ZodSchema, ZodType, ZodTypeDef } from 'zod';
import { createContext, useContext, Dispatch } from 'react';
import { DefaultConfigs } from './interfaces';

type GlobalState = Record<string, NetworkState>;

interface RequestType<T = any> extends AxiosRequestConfig {
  originalData?: T; // Keeps track of the original data type.
  key: string;
  source: string
}

export type SchemaOf<T> = ZodType<T, ZodTypeDef, any>;

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
  dispatch: Dispatch<NetworkAction<unknown>>;
  configs: ${configType};
  execute: <T>(request: RequestType, dispatch: (state: NetworkState<T>) => void, schema: SchemaOf<T> | undefined, errorSchema: SchemaOf<T> | undefined) => Promise<void>;
}

/**
 * Context object created using \`createContext\` function. Provides a way to share state, dispatch functions,
 * and axios instance across components without having to pass props down manually at every level.
 *
 * @type {ContextType}
 */
const Context = createContext<ContextType>({
  state: {},
  filteredState: {},
  dispatch() {
    //intentionally left blank
  },
  configs: {},
  async execute() {
    //intentionally left blank
  },
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
