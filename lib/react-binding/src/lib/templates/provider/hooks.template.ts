import {typescript} from "common";
import * as path from 'path'

export function reactProviderHooksTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "provider-hooks.ts"))
  return ts`import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  ErrorState,
  ErrorWithContext,
  isSuccess,
  isError,
  isPending,
  NetworkState,
  pending,
  Progress,
  init,
} from './network-state';
import {
  AxiosProgressEvent,
} from 'axios';
import { ZodSchema } from 'zod';
import logger from './logger';

import { Context, RequestType, SchemaOf } from './intrig-context';
import { NetworkStateProps } from './interfaces';
import { debounce } from './reducer';

/**
 * useNetworkState is a custom hook that manages the network state within the specified context.
 * It handles making network requests, dispatching appropriate states based on the request lifecycle,
 * and allows aborting ongoing requests.
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
      requestDebounceDelay ?? context.configs?.[source as keyof (typeof context)['configs']]?.debounceDelay ?? 0
    );
  }, [context.configs, requestDebounceDelay, source]);

  const execute = useCallback(
    async (request: RequestType) => {
      logger.info(${"`Executing request ${key} ${operation} ${source}`"});
      logger.debug("=>", request)

      const abortController = new AbortController();
      setAbortController(abortController);

      const requestConfig: RequestType = {
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
    [networkState, context.dispatch],
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
        const [source, operation, key] = k.split(':');
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
    const pendingStates = Object.values(
      ctx.filteredState as Record<string, NetworkState>,
    ).filter(isPending);
    if (!pendingStates.length) {
      return init();
    }

    const progress = pendingStates
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
    return pending(progress.total ? progress : undefined);
  }, [ctx.filteredState]);

  return result;
}
  `
}