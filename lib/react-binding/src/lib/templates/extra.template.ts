import {typescript} from "common";
import * as path from 'path'

export function extraTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "extra.ts"))

  return ts`
  import {
  error,
  init, IntrigHook,
  isError,
  isSuccess,
  isValidationError,
  NetworkState,
  pending,
  success
} from '@intrig/react/network-state';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useIntrigContext } from '@intrig/react/intrig-context';

/**
 * Converts a given hook into a promise-based function.
 *
 * @param {IntrigHook<P, B, T>} hook - The hook function to be converted.
 * @param {string} [key='default'] - An optional key to uniquely identify the hook instance.
 *
 * @return {[(...params: Parameters<ReturnType<IntrigHook<P, B, T>>[1]>) => Promise<T>, () => void]}
 * Returns a tuple containing a function that invokes the hook as a promise and a function to clear the state.
 */
export function useAsPromise<P, B, T>(hook: IntrigHook<P, B, T>, key: string = 'default'): [(...params: Parameters<ReturnType<IntrigHook<P, B, T>>[1]>) => Promise<T>, () => void] {
  const resolveRef = useRef<(value: T) => void>();
  const rejectRef = useRef<(reason?: any) => void>();

  let [state, dispatch, clear] = hook(key);

  useEffect(() => {
    if (isSuccess(state)) {
      resolveRef.current?.(state.data);
      clear();
    } else if (isError(state)) {
      rejectRef.current?.(state.error);
      clear()
    }
  }, [state]);

  const promiseFn = useCallback((...args: Parameters<ReturnType<IntrigHook<P, B, T>>[1]>) => {
    return new Promise<T>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      let dispatchState = (dispatch as any)(...args);
      if (isValidationError(dispatchState)) {
        reject(dispatchState.error);
      }
    });
  }, [dispatch]);

  return [
    promiseFn,
    clear
  ];
}

/**
 * A custom hook that manages and returns the network state of a promise-based function,
 * providing a way to execute the function and clear its state.
 *
 * @param fn The promise-based function whose network state is to be managed. It should be a function that returns a promise.
 * @param key An optional identifier for the network state. Defaults to 'default'.
 * @return A tuple containing the current network state, a function to execute the promise, and a function to clear the state.
 */
export function useAsNetworkState<T, F extends ((...args: any) => Promise<T>)>(fn: F, key: string = 'default'): [NetworkState<T>, (...params: Parameters<F>) => void, () => void] {
  let id = useId();

  let context = useIntrigContext();

  const networkState = useMemo(() => {
    return context.state?.[${"`promiseState:${id}:${key}}`"}] ?? init()
  }, [context.state?.[${"`promiseState:${id}:${key}}`"}]]);

  const dispatch = useCallback(
    (state: NetworkState<T>) => {
      context.dispatch({ key, operation: id, source: 'promiseState', state });
    },
    [key, context.dispatch]
  );

  const execute = useCallback((...args: Parameters<F>) => {
    dispatch(pending())
    return fn(...args).then(
      (data) => {
        dispatch(success(data))
      },
      (e) => {
        dispatch(error(e))
      }
    )
  }, []);

  const clear = useCallback(() => {
    dispatch(init())
  }, []);

  return [
    networkState,
    execute,
    clear
  ]
}

`
}
