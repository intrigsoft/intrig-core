import {typescript} from "common";
import * as path from 'path'

export function reactExtraTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "extra.ts"))

  return ts`import {
  BinaryFunctionHook,
  BinaryHookOptions,
  BinaryProduceHook,
  ConstantHook,
  error,
  init,
  IntrigHook,
  IntrigHookOptions,
  isSuccess,
  NetworkState,
  pending,
  success,
  UnaryFunctionHook,
  UnaryHookOptions,
  UnaryProduceHook,
  UnitHook,
  UnitHookOptions,
} from '@intrig/react/network-state';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { useIntrigContext } from '@intrig/react/intrig-context';

/**
 * A custom hook that manages and returns the network state of a promise-based function,
 * providing a way to execute the function and clear its state.
 *
 * @param fn The promise-based function whose network state is to be managed. It should be a function that returns a promise.
 * @param key An optional identifier for the network state. Defaults to 'default'.
 * @return A tuple containing the current network state, a function to execute the promise, and a function to clear the state.
 */
export function useAsNetworkState<T, F extends (...args: any) => Promise<T>>(
  fn: F,
  options: any = {},
): [NetworkState<T>, (...params: Parameters<F>) => void, () => void] {
  const id = useId();

  const context = useIntrigContext();

  const key = options.key ?? 'default';

  const networkState = useMemo(() => {
    return context.state?.[${"`promiseState:${id}:${key}}`"}] ?? init();
  }, [context.state?.[${"`promiseState:${id}:${key}}`"}]]);

  const dispatch = useCallback(
    (state: NetworkState<T>) => {
      context.dispatch({ key, operation: id, source: 'promiseState', state });
    },
    [key, context.dispatch],
  );

  const execute = useCallback((...args: any[]) => {
    dispatch(pending());
    return fn(...args).then(
      (data) => {
        dispatch(success(data));
      },
      (e) => {
        dispatch(error(e));
      },
    );
  }, []);

  const clear = useCallback(() => {
    dispatch(init());
  }, []);

  return [networkState, execute, clear];
}

/**
 * A custom hook that resolves the value from the provided hook's state and updates it whenever the state changes.
 *
 * @param {IntrigHook<P, B, T>} hook - The hook that provides the state to observe and resolve data from.
 * @param options
 * @return {T | undefined} The resolved value from the hook's state or undefined if the state is not successful.
 */
export function useResolvedValue(
  hook: UnitHook,
  options: UnitHookOptions,
): undefined;

export function useResolvedValue<T>(
  hook: ConstantHook<T>,
  options: UnitHookOptions,
): T | undefined;

export function useResolvedValue<P>(
  hook: UnaryProduceHook<P>,
  options: UnaryHookOptions<P>,
): undefined;

export function useResolvedValue<P, T>(
  hook: UnaryFunctionHook<P, T>,
  options: UnaryHookOptions<P>,
): T | undefined;

export function useResolvedValue<P, B>(
  hook: BinaryProduceHook<P, B>,
  options: BinaryHookOptions<P, B>,
): undefined;

export function useResolvedValue<P, B, T>(
  hook: BinaryFunctionHook<P, B, T>,
  options: BinaryHookOptions<P, B>,
): T | undefined;

// **Implementation**
export function useResolvedValue<P, B, T>(
  hook: IntrigHook<P, B, T>,
  options: IntrigHookOptions<P, B>,
): T | undefined {
  const [value, setValue] = useState<T | undefined>();

  const [state] = hook(options as any); // Ensure compatibility with different hook types

  useEffect(() => {
    if (isSuccess(state)) {
      setValue(state.data);
    } else {
      setValue(undefined);
    }
  }, [state]);

  return value;
}

/**
 * A custom hook that resolves and caches the value from a successful state provided by the given hook.
 * The state is updated only when it is in a successful state.
 *
 * @param {IntrigHook<P, B, T>} hook - The hook that provides the state to observe and cache data from.
 * @param options
 * @return {T | undefined} The cached value from the hook's state or undefined if the state is not successful.
 */
export function useResolvedCachedValue(
  hook: UnitHook,
  options: UnitHookOptions,
): undefined;

export function useResolvedCachedValue<T>(
  hook: ConstantHook<T>,
  options: UnitHookOptions,
): T | undefined;

export function useResolvedCachedValue<P>(
  hook: UnaryProduceHook<P>,
  options: UnaryHookOptions<P>,
): undefined;

export function useResolvedCachedValue<P, T>(
  hook: UnaryFunctionHook<P, T>,
  options: UnaryHookOptions<P>,
): T | undefined;

export function useResolvedCachedValue<P, B>(
  hook: BinaryProduceHook<P, B>,
  options: BinaryHookOptions<P, B>,
): undefined;

export function useResolvedCachedValue<P, B, T>(
  hook: BinaryFunctionHook<P, B, T>,
  options: BinaryHookOptions<P, B>,
): T | undefined;

// **Implementation**
export function useResolvedCachedValue<P, B, T>(
  hook: IntrigHook<P, B, T>,
  options: IntrigHookOptions<P, B>,
): T | undefined {
  const [cachedValue, setCachedValue] = useState<T | undefined>();

  const [state] = hook(options as any); // Ensure compatibility with different hook types

  useEffect(() => {
    if (isSuccess(state)) {
      setCachedValue(state.data);
    }
    // Do not clear cached value if state is unsuccessful
  }, [state]);

  return cachedValue;
}

`
}
