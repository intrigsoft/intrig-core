import React, {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  error,
  ErrorState,
  ErrorWithContext,
  init,
  IntrigHook,
  isError,
  isPending,
  NetworkAction,
  NetworkState,
  pending,
  Progress,
  success,
} from './network-state';
import axios, {
  Axios,
  AxiosProgressEvent,
  CreateAxiosDefaults,
  isAxiosError,
} from 'axios';
import { ZodSchema } from 'zod';
import logger from './logger';
import { flushSync } from 'react-dom';
import { createParser } from 'eventsource-parser';

import { Context, RequestType, GlobalState } from './intrig-context';

/**
 * Handles state updates for network requests based on the provided action.
 *
 * @param {GlobalState} state - The current state of the application.
 * @param {NetworkAction<unknown>} action - The action containing source, operation, key, and state.
 * @return {GlobalState} - The updated state after applying the action.
 */
function requestReducer(
  state: GlobalState,
  action: NetworkAction<unknown, unknown>,
): GlobalState {
  return {
    ...state,
    [`${action.source}:${action.operation}:${action.key}`]: action.state,
  };
}

export interface DefaultConfigs extends CreateAxiosDefaults {
  debounceDelay?: number;
}

export interface IntrigProviderProps {
  configs?: Record<string, DefaultConfigs>;
  children: React.ReactNode;
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
      deamon_api: axios.create({
        ...(configs.defaults ?? {}),
        ...(configs['deamon_api'] ?? {}),
      }),
    };
  }, [configs]);

  const contextValue = useMemo(() => {
    async function execute<T, E = unknown>(
      request: RequestType,
      dispatch: (state: NetworkState<T, E>) => void,
      schema: ZodSchema<T> | undefined,
      errorSchema: ZodSchema<E> | undefined,
    ) {
      try {
        dispatch(pending());
        let response = await axiosInstances[request.source].request(request);

        if (response.status >= 200 && response.status < 300) {
          if (
            response.headers?.['content-type']?.includes('text/event-stream')
          ) {
            const reader = response.data.getReader();
            const decoder = new TextDecoder();

            let lastMessage: any;

            const parser = createParser({
              onEvent(message) {
                let decoded = message.data;
                try {
                  let parsed = JSON.parse(decoded);
                  if (schema) {
                    let validated = schema.safeParse(parsed);
                    if (!validated.success) {
                      dispatch(
                        error(validated.error.issues, response.status, request),
                      );
                      return;
                    }
                    parsed = validated.data;
                  }
                  decoded = parsed;
                } catch (e) {
                  console.error(e);
                }
                lastMessage = decoded;
                flushSync(() => dispatch(pending(undefined, decoded)));
              },
            });

            while (true) {
              let { done, value } = await reader.read();
              if (done) {
                flushSync(() => dispatch(success(lastMessage)));
                break;
              }

              parser.feed(decoder.decode(value, { stream: true }));
            }
          } else if (schema) {
            let data = schema.safeParse(response.data);
            if (!data.success) {
              dispatch(error(data.error.issues, response.status, request));
              return;
            }
            dispatch(success(data.data));
          } else {
            dispatch(success(response.data));
          }
        } else {
          let { data } =
            errorSchema?.safeParse(response.data ?? {}) ?? {};
          //todo: handle error validation error.
          dispatch(
            error(
              data ?? response.data ?? response.statusText,
              response.status,
            ),
          );
        }
      } catch (e: any) {
        if (isAxiosError(e)) {
          let { data } =
            errorSchema?.safeParse(e.response?.data ?? {}) ?? {};
          dispatch(
            error(data ?? e.response?.data, e.response?.status, request),
          );
        } else {
          dispatch(error(e));
        }
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

export interface StubType<P, B, T> {
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
  stubs?: (stub: StubType<any, any, any>) => void;
};

export interface IntrigProviderStubProps {
  configs?: DefaultConfigs;
  stubs?: (stub: StubType<any, any, any>) => void;
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
        } catch (e) {
          dispatch(error(e));
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
    (event: NetworkAction<any, any>) => {
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

export interface NetworkStateProps<T, E = unknown> {
  key: string;
  operation: string;
  source: string;
  schema?: ZodSchema<T>;
  errorSchema?: ZodSchema<E>;
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
export function useNetworkState<T, E = unknown>({
  key,
  operation,
  source,
  schema,
  errorSchema,
  debounceDelay: requestDebounceDelay,
}: NetworkStateProps<T>): [
  NetworkState<T, E>,
  (request: RequestType) => void,
  clear: () => void,
  (state: NetworkState<T, E>) => void,
] {
  const context = useContext(Context);

  const [abortController, setAbortController] = useState<AbortController>();

  const networkState = useMemo(() => {
    logger.info(`Updating status ${key} ${operation} ${source}`);
    logger.debug('<=', context.state?.[`${source}:${operation}:${key}`]);
    return (
      (context.state?.[`${source}:${operation}:${key}`] as NetworkState<T>) ??
      init()
    );
  }, [JSON.stringify(context.state?.[`${source}:${operation}:${key}`])]);

  const dispatch = useCallback(
    (state: NetworkState<T>) => {
      context.dispatch({ key, operation, source, state });
    },
    [key, operation, source, context.dispatch],
  );

  const debounceDelay = useMemo(() => {
    return requestDebounceDelay ?? context.configs?.debounceDelay ?? 0;
  }, [context.configs, requestDebounceDelay]);

  const execute = useCallback(
    async (request: RequestType) => {
      logger.info(`Executing request ${key} ${operation} ${source}`);
      logger.debug('=>', request);

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
    logger.info(`Clearing request ${key} ${operation} ${source}`);
    dispatch(init());
    setAbortController((abortController) => {
      logger.info(`Aborting request ${key} ${operation} ${source}`);
      abortController?.abort();
      return undefined;
    });
  }, [dispatch, abortController]);

  return [networkState, deboundedExecute, clear, dispatch];
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
    return Object.entries(ctx.filteredState)
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
    let pendingStates = Object.values(ctx.filteredState).filter(isPending);
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
