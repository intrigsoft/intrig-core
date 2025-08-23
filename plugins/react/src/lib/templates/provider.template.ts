import {IntrigSourceConfig, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function reactProviderTemplate(apisToSync: IntrigSourceConfig[]) {

  const axiosConfigs = apisToSync.map(a => `
  ${a.id}: createAxiosInstance(configs.defaults, configs['${a.id}']),
  `).join("\n");

  const configType = `{
  defaults?: DefaultConfigs,
  ${apisToSync.map(a => `${a.id}?: DefaultConfigs`).join(",\n  ")}
  }`

  const ts = typescript(path.resolve("src", "intrig-provider.tsx"))
  return ts`import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  useRef,
} from 'react';
import {
  error,
  ErrorState,
  ErrorWithContext,
  init,
  IntrigHook,
  isSuccess,
  isError,
  isPending,
  NetworkAction,
  NetworkState,
  pending,
  Progress,
  success, responseValidationError, configError, httpError, networkError,
} from './network-state';
import axios, {
  Axios,
  AxiosProgressEvent,
  AxiosResponse,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import {ZodError, ZodSchema} from 'zod';
import logger from './logger';
import { flushSync } from 'react-dom';
import { createParser } from 'eventsource-parser';

import { Context, RequestType, GlobalState, SchemaOf } from './intrig-context';

/**
 * Handles state updates for network requests based on the provided action.
 *
 * @param {GlobalState} state - The current state of the application.
 * @param {NetworkAction<unknown>} action - The action containing source, operation, key, and state.
 * @return {GlobalState} - The updated state after applying the action.
 */
function requestReducer(
  state: GlobalState,
  action: NetworkAction<unknown>,
): GlobalState {
  return {
    ...state,
    [${"`${action.source}:${action.operation}:${action.key}`"}]: action.state,
  };
}

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

function createAxiosInstance(
  defaultConfig?: DefaultConfigs,
  config?: DefaultConfigs,
) {
  const axiosInstance = axios.create({
    ...(defaultConfig ?? {}),
    ...(config ?? {}),
  });
  async function requestInterceptor(cfg: InternalAxiosRequestConfig) {
    let intermediate = (await defaultConfig?.requestInterceptor?.(cfg)) ?? cfg;
    return config?.requestInterceptor?.(intermediate) ?? intermediate;
  }

  async function responseInterceptor(cfg: AxiosResponse<any>) {
    let intermediate = (await defaultConfig?.responseInterceptor?.(cfg)) ?? cfg;
    return config?.responseInterceptor?.(intermediate) ?? intermediate;
  }

  axiosInstance.interceptors.request.use(requestInterceptor);
  axiosInstance.interceptors.response.use(responseInterceptor, (error) => {
    return Promise.reject(error);
  });
  return axiosInstance;
}

function inferNetworkReason(e: any): 'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown' {
  if (e?.code === 'ECONNABORTED') return 'timeout';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (e?.name === 'AbortError') return 'aborted';
  return 'unknown';
}

/**
 * IntrigProvider is a context provider component that sets up global state management
 * and provides Axios instances for API requests.
 *
 * @param {Object} props - The properties object.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 * @param {Object} [props.configs={}] - Configuration object for Axios instances.
 * @param {Object} [props.configs.defaults={}] - Default configuration for Axios.
 * @param {Object} [props.configs.petstore={}] - Configuration specific to the petstore API.
 * @return {JSX.Element} A context provider component that wraps the provided children.
 */
export function IntrigProvider({
  children,
  configs = {},
}: IntrigProviderProps) {
  const [state, dispatch] = useReducer(requestReducer, {} as GlobalState);

  const axiosInstances: Record<string, Axios> = useMemo(() => {
    return {
      ${axiosConfigs}
    }
  }, [configs]);

  const contextValue = useMemo(() => {
    async function execute<T>(
      request: RequestType,
      setState: (s: NetworkState<T>) => void,
      schema?: ZodSchema<T>,          // success payload schema (optional)
      errorSchema?: ZodSchema<any>,   // error-body schema for non-2xx (optional)
    ) {
      try {
        setState(pending());

        const axios = axiosInstances[request.source];
        if (!axios) {
          setState(error(configError(${"`Unknown axios source '${request.source}'`"})));
          return;
        }

        const response = await axios.request(request);
        const status  = response.status;
        const method  = (response.config?.method || 'GET').toUpperCase();
        const url     = response.config?.url || '';
        const ctype   = String(response.headers?.['content-type'] || '');

        // -------------------- 2xx branch --------------------
        if (status >= 200 && status < 300) {
          // SSE stream
          if (ctype.includes('text/event-stream')) {
            const reader  = response.data.getReader();
            const decoder = new TextDecoder();

            let lastMessage: any;

            const parser = createParser({
              onEvent(evt) {
                let decoded: unknown = evt.data;

                // Try JSON parse; if schema is defined, we require valid JSON for validation
                try {
                  let parsed: unknown = JSON.parse(String(decoded));
                  if (schema) {
                    const vr = schema.safeParse(parsed);
                    if (!vr.success) {
                      setState(error(responseValidationError(vr.error, parsed)));
                      return;
                    }
                    parsed = vr.data;
                  }
                  decoded = parsed;
                } catch (ignore) {
                  if (schema) {
                    // schema expects structured data but chunk wasn’t JSON
                    setState(error(responseValidationError(new ZodError([]), decoded)));
                    return;
                  }
                  // if no schema, pass raw text
                }

                lastMessage = decoded;
                flushSync(() => setState(pending(undefined, decoded as T)));
              },
            });

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                flushSync(() => setState(success(lastMessage as T, response.headers)));
                break;
              }
              parser.feed(decoder.decode(value, { stream: true }));
            }
            return;
          }

          // Non-SSE: validate body if a schema is provided
          if (schema) {
            const parsed = schema.safeParse(response.data);
            if (!parsed.success) {
              setState(error(responseValidationError(parsed.error, response.data)));
              return;
            }
            setState(success(parsed.data, response.headers));
            return;
          }

          // No schema → pass through
          setState(success(response.data as T, response.headers));
          return;
        }

        // -------------------- non-2xx (HTTP error) --------------------
        let errorBody: unknown = response.data;

        if (errorSchema) {
          const ev = errorSchema.safeParse(errorBody ?? {});
          if (!ev.success) {
            setState(error(responseValidationError(ev.error, errorBody)));
            return;
          }
          errorBody = ev.data;
        }

        // NOTE: your httpError signature is (status, url, method, headers?, body?)
        setState(error(httpError(status, url, method, response.headers, errorBody)));

      } catch (e: any) {
        // -------------------- thrown / transport --------------------
        if (isAxiosError(e)) {
          const status = e.response?.status;
          const method = (e.config?.method || 'GET').toUpperCase();
          const url    = e.config?.url || '';

          if (status != null) {
            // HTTP error with response
            let errorBody: unknown = e.response?.data;

            if (errorSchema) {
              const ev = errorSchema.safeParse(errorBody ?? {});
              if (!ev.success) {
                setState(error(responseValidationError(ev.error, errorBody)));
                return;
              }
              errorBody = ev.data;
            }

            setState(error(httpError(status, url, method, e.response?.headers, errorBody)));
            return;
          }

          // No response → network layer
          setState(error(networkError(inferNetworkReason(e), e.request)));
          return;
        }

        // Non-Axios exception → treat as unknown network-ish failure
        setState(error(networkError('unknown')));
      }
    }
    return {
      state,
      dispatch,
      filteredState: state,
      configs,
      execute,
    };
  }, [state, axiosInstances]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
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
  configs?: {
    defaults?: DefaultConfigs;
    employee_api?: DefaultConfigs;
  };
  stubs?: (stub: StubType) => void;
  children: React.ReactNode;
}

export function IntrigProviderStub({
  children,
  configs = {},
  stubs = () => {},
}: IntrigProviderStubProps) {
  const [state, dispatch] = useReducer(requestReducer, {} as GlobalState);

  const collectedStubs = useMemo(() => {
    let fns: Record<
      string,
      (
        params: any,
        body: any,
        dispatch: (state: NetworkState<any>) => void,
      ) => Promise<void>
    > = {};
    function stub<P, B, T>(
      hook: IntrigHook<P, B, T>,
      fn: (
        params: P,
        body: B,
        dispatch: (state: NetworkState<T>) => void,
      ) => Promise<void>,
    ) {
      fns[hook.key] = fn;
    }
    stubs(stub);
    return fns;
  }, [stubs]);

  const contextValue = useMemo(() => {
    async function execute<T>(
      request: RequestType,
      dispatch: (state: NetworkState<T>) => void,
      schema: ZodSchema<T> | undefined,
    ) {
      let stub = collectedStubs[request.key];

      if (!!stub) {
        try {
          await stub(request.params, request.data, dispatch);
        } catch (e: any) {
          dispatch(error(configError(e?.message ?? '')));
        }
      } else {
        dispatch(init());
      }
    }

    return {
      state,
      dispatch,
      filteredState: state,
      configs,
      execute,
    };
  }, [state, dispatch, configs, collectedStubs]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export interface StatusTrapProps {
  type: 'pending' | 'error' | 'pending + error';
  propagate?: boolean;
}

/**
 * StatusTrap component is used to track and manage network request states.
 *
 * @param {Object} props - The properties object.
 * @param {React.ReactNode} props.children - The child elements to be rendered.
 * @param {string} props.type - The type of network state to handle ("error", "pending", "pending + error").
 * @param {boolean} [props.propagate=true] - Whether to propagate the event to the parent context.
 * @return {React.ReactElement} The context provider component with filtered state and custom dispatch.
 */
export function StatusTrap({
  children,
  type,
  propagate = true,
}: PropsWithChildren<StatusTrapProps>) {
  const ctx = useContext(Context);

  const [requests, setRequests] = useState<string[]>([]);

  const shouldHandleEvent = useCallback(
    (state: NetworkState) => {
      switch (type) {
        case 'error':
          return isError(state);
        case 'pending':
          return isPending(state);
        case 'pending + error':
          return isPending(state) || isError(state);
        default:
          return false;
      }
    },
    [type],
  );

  const dispatch = useCallback(
    (event: NetworkAction<any>) => {
      if (!event.handled) {
        if (shouldHandleEvent(event.state)) {
          setRequests((prev) => [...prev, event.key]);
          if (!propagate) {
            ctx.dispatch({
              ...event,
              handled: true,
            });
            return;
          }
        } else {
          setRequests((prev) => prev.filter((k) => k !== event.key));
        }
      }
      ctx.dispatch(event);
    },
    [ctx, propagate, shouldHandleEvent],
  );

  const filteredState = useMemo(() => {
    return Object.fromEntries(
      Object.entries(ctx.state).filter(([key]) => requests.includes(key)),
    );
  }, [ctx.state, requests]);

  return (
    <Context.Provider
      value={{
        ...ctx,
        dispatch,
        filteredState,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export interface NetworkStateProps<T> {
  key: string;
  operation: string;
  source: string;
  schema?: SchemaOf<T>;
  errorSchema?: SchemaOf<any>;
  debounceDelay?: number;
}

/**
 * useNetworkState is a custom hook that manages the network state within the specified context.
 * It handles making network requests, dispatching appropriate states based on the request lifecycle,
 * and allows aborting ongoing requests.
 *
 * @param {Object} params - The parameters required to configure and use the network state.
 * @param {string} params.key - A unique identifier for the network request.
 * @param {string} params.operation - The operation type related to the request.
 * @param {string} params.source - The source or endpoint for the network request.
 * @param {Object} params.schema - The schema used for validating the response data.
 * @param {number} [params.debounceDelay] - The debounce delay for executing the network request.
 *
 * @return {[NetworkState<T>, (request: AxiosRequestConfig) => void, () => void]}
 *          Returns a state object representing the current network state,
 *          a function to execute the network request, and a function to clear the request.
 */
export function useNetworkState<T>({
  key,
  operation,
  source,
  schema,
  errorSchema,
  debounceDelay: requestDebounceDelay,
}: NetworkStateProps<T>): [
  NetworkState<T>,
  (request: RequestType) => void,
  () => void,
  (state: NetworkState<T>) => void,
] {
  const context = useContext(Context);

  const [abortController, setAbortController] = useState<AbortController>();

  const networkState = useMemo(() => {
    logger.info(${"`Updating status ${key} ${operation} ${source}`"});
    logger.debug("<=", context.state?.[${"`${source}:${operation}:${key}`"}])
    return (
      (context.state?.[${"`${source}:${operation}:${key}`"}] as NetworkState<T>) ??
      init()
    );
  }, [JSON.stringify(context.state?.[${"`${source}:${operation}:${key}`"}])]);

  const dispatch = useCallback(
    (state: NetworkState<T>) => {
      context.dispatch({ key, operation, source, state });
    },
    [key, operation, source, context.dispatch],
  );

  const debounceDelay = useMemo(() => {
    return (
      requestDebounceDelay ?? context.configs?.[source]?.debounceDelay ?? 0
    );
  }, [context.configs, requestDebounceDelay, source]);

  const execute = useCallback(
    async (request: RequestType) => {
      logger.info(${"`Executing request ${key} ${operation} ${source}`"});
      logger.debug("=>", request)

      let abortController = new AbortController();
      setAbortController(abortController);

      let requestConfig: RequestType = {
        ...request,
        onUploadProgress(event: AxiosProgressEvent) {
          dispatch(
            pending({
              type: 'upload',
              loaded: event.loaded,
              total: event.total,
            }),
          );
          request.onUploadProgress?.(event);
        },
        onDownloadProgress(event: AxiosProgressEvent) {
          dispatch(
            pending({
              type: 'download',
              loaded: event.loaded,
              total: event.total,
            }),
          );
          request.onDownloadProgress?.(event);
        },
        signal: abortController.signal,
      };

      await context.execute(
        requestConfig,
        dispatch,
        schema,
        errorSchema as any,
      );
    },
    [networkState, context.dispatch, axios],
  );

  const deboundedExecute = useMemo(
    () => debounce(execute, debounceDelay ?? 0),
    [execute],
  );

  const clear = useCallback(() => {
    logger.info(${"`Clearing request ${key} ${operation} ${source}`"});
    dispatch(init());
    setAbortController((abortController) => {
      logger.info(${"`Aborting request ${key} ${operation} ${source}`"});
      abortController?.abort();
      return undefined;
    });
  }, [dispatch, abortController]);

  return [networkState, deboundedExecute, clear, dispatch];
}

/**
 * A hook for making transient calls that can be aborted and validated against schemas.
 *
 * @param {Object} options The options object.
 * @param {ZodSchema<T>} [options.schema] Optional schema to validate the response data.
 * @param {ZodSchema<T>} [options.errorSchema] Optional schema to validate the error response data.
 * @return {[function(RequestType): Promise<T>, function(): void]} Returns a tuple containing a function to execute the request and a function to abort the ongoing request.
 */
export function useTransitionCall<T>({
  schema,
  errorSchema,
}: {
  schema?: SchemaOf<T>;
  errorSchema?: SchemaOf<T>;
}): [(request: RequestType) => Promise<T>, () => void] {
  const ctx = useContext(Context);
  const controller = useRef<AbortController | undefined>(undefined);

  const call = useCallback(
    async (request: RequestType) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;

      return new Promise<T>((resolve, reject) => {
        ctx.execute(
          { ...request, signal: abort.signal },
          (state) => {
            if (isSuccess(state)) {
              resolve(state.data as T);
            } else if (isError(state)) {
              reject(state.error);
            }
          },
          schema,
          errorSchema,
        );
      });
    },
    [ctx, schema, errorSchema],
  );

  const abort = useCallback(() => {
    controller.current?.abort();
  }, []);

  return [call, abort];
}

function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeoutId: any;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Handles central error extraction from the provided context.
 * It filters the state to retain error states and maps them to a structured error object with additional context information.
 * @return {Object[]} An array of objects representing the error states with context information such as source, operation, and key.
 */
export function useCentralError() {
  const ctx = useContext(Context);

  return useMemo(() => {
    return Object.entries(ctx.filteredState as Record<string, NetworkState>)
      .filter(([, state]) => isError(state))
      .map(([k, state]) => {
        let [source, operation, key] = k.split(':');
        return {
          ...(state as ErrorState<unknown>),
          source,
          operation,
          key,
        } satisfies ErrorWithContext;
      });
  }, [ctx.filteredState]);
}

/**
 * Uses central pending state handling by aggregating pending states from context.
 * It calculates the overall progress of pending states if any, or returns an initial state otherwise.
 *
 * @return {NetworkState} The aggregated network state based on the pending states and their progress.
 */
export function useCentralPendingState() {
  const ctx = useContext(Context);

  const result: NetworkState = useMemo(() => {
    let pendingStates = Object.values(
      ctx.filteredState as Record<string, NetworkState>,
    ).filter(isPending);
    if (!pendingStates.length) {
      return init();
    }

    let progress = pendingStates
      .filter((a) => a.progress)
      .reduce(
        (progress, current) => {
          return {
            total: progress.total + (current.progress?.total ?? 0),
            loaded: progress.loaded + (current.progress?.loaded ?? 0),
          };
        },
        { total: 0, loaded: 0 } satisfies Progress,
      );
    return pending(!!progress.total ? progress : undefined);
  }, [ctx.filteredState]);

  return result;
}
  `
}
