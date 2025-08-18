import {IntrigSourceConfig, typescript} from "common";
import * as path from 'path'

export function nextProviderComponentsTemplate(_path: string, apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve(_path, "src", "provider-components.tsx"))
  return ts`"use client"
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
  isSuccess,
  isError,
  isPending,
  NetworkState,
  pending,
  success,
  responseValidationError,
  configError,
  httpError,
  networkError,
  init,
} from './network-state';
import {
  Axios,
  AxiosProgressEvent,
  AxiosResponse,
  isAxiosError,
} from 'axios';
import { ZodError, ZodSchema } from 'zod';
import logger from './logger';
import { flushSync } from 'react-dom';
import { createParser } from 'eventsource-parser';

import { Context, RequestType, GlobalState } from './intrig-context';
import {
  DefaultConfigs,
  IntrigProviderProps,
  IntrigProviderStubProps,
  StatusTrapProps,
  StubType,
} from './interfaces';
import { createAxiosInstances } from './axios-config';
import { requestReducer, inferNetworkReason } from './reducer';

/**
 * IntrigProvider is a context provider component that sets up global state management
 * and provides Axios instances for API requests.
 */
export function IntrigProvider({
  children,
  configs = {},
}: IntrigProviderProps) {
  const [state, dispatch] = useReducer(requestReducer, {} as GlobalState);

  const axiosInstances: Record<string, Axios> = useMemo(() => {
    return createAxiosInstances(configs);
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
          setState(error(configError(\`Unknown axios source '\${request.source}'\`)));
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
                    // schema expects structured data but chunk wasn't JSON
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
      hook: any,
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

/**
 * StatusTrap component is used to track and manage network request states.
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
    (event: any) => {
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
  `
}