'use client';
import {
  BinaryFunctionHook,
  BinaryHookOptions,
  BinaryProduceHook,
  ConstantHook,
  error,
  init,
  IntrigHook,
  IntrigHookOptions,
  isError,
  isSuccess,
  isValidationError,
  NetworkState,
  pending,
  success,
  UnaryFunctionHook,
  UnaryHookOptions,
  UnaryProduceHook,
  UnitHook,
  UnitHookOptions,
} from './network-state';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIntrigContext } from './intrig-context';

/**
 * Converts a given hook into a promise-based function.
 *
 * @param {IntrigHook<P, B, T>} hook - The hook function to be converted.
 * @param options
 *
 * @return {[(...params: Parameters<ReturnType<IntrigHook<P, B, T>>[1]>) => Promise<T>, () => void]}
 * Returns a tuple containing a function that invokes the hook as a promise and a function to clear the state.
 */
export function useAsPromise<E>(
  hook: UnitHook<E>,
  options: UnitHookOptions,
): [() => Promise<never>, () => void];
export function useAsPromise<T, E>(
  hook: ConstantHook<T, E>,
  options: UnitHookOptions,
): [() => Promise<T>, () => void];
export function useAsPromise<P, E>(
  hook: UnaryProduceHook<P, E>,
  options?: UnaryHookOptions<P>,
): [(params: P) => Promise<never>, () => void];
export function useAsPromise<P, T, E>(
  hook: UnaryFunctionHook<P, T, E>,
  options?: UnaryHookOptions<P>,
): [(params: P) => Promise<T>, () => void];
export function useAsPromise<P, B, E>(
  hook: BinaryProduceHook<P, B, E>,
  options?: BinaryHookOptions<P, B>,
): [(body: B, params: P) => Promise<never>, () => void];
export function useAsPromise<P, B, T, E>(
  hook: BinaryFunctionHook<P, B, T, E>,
  options?: BinaryHookOptions<P, B>,
): [(body: B, params: P) => Promise<T>, () => void];

// **Implementation**
export function useAsPromise<P, B, T, E>(
  hook: IntrigHook<P, B, T, E>,
  options?: IntrigHookOptions<P, B>,
): [(...args: any[]) => Promise<T>, () => void] {
  // <- Compatible return type
  const resolveRef = useRef<(value: T) => void>(() => {});
  const rejectRef = useRef<(reason?: any) => void>(() => {});

  const [state, dispatch, clear] = hook(options as any);

  useEffect(() => {
    if (isSuccess(state)) {
      resolveRef.current?.(state.data);
      clear();
    } else if (isError(state)) {
      rejectRef.current?.(state.error);
      clear();
    }
  }, [state]);

  const promiseFn = useCallback(
    (...args: any[]) => {
      return new Promise<T>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        const dispatchState = (dispatch as any)(...args);
        if (isValidationError(dispatchState)) {
          reject(dispatchState.error);
        }
      });
    },
    [dispatch],
  );

  return [promiseFn, clear];
}

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
  key = 'default',
): [NetworkState<T>, (...params: Parameters<F>) => void, () => void] {
  const id = useId();

  const context = useIntrigContext();

  const networkState = useMemo(() => {
    return context.state?.[`promiseState:${id}:${key}`] ?? init();
  }, [context.state?.[`promiseState:${id}:${key}`]]);

  const dispatch = useCallback(
    (state: NetworkState<T>) => {
      context.dispatch({ key, operation: id, source: 'promiseState', state });
    },
    [key, context.dispatch],
  );

  const execute = useCallback((...args: Parameters<F>) => {
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
export function useResolvedValue<E>(
  hook: UnitHook<E>,
  options: UnitHookOptions,
): undefined;

export function useResolvedValue<T, E>(
  hook: ConstantHook<T, E>,
  options: UnitHookOptions,
): T | undefined;

export function useResolvedValue<P, E>(
  hook: UnaryProduceHook<P, E>,
  options: UnaryHookOptions<P>,
): undefined;

export function useResolvedValue<P, T, E>(
  hook: UnaryFunctionHook<P, T, E>,
  options: UnaryHookOptions<P>,
): T | undefined;

export function useResolvedValue<P, B, E>(
  hook: BinaryProduceHook<P, B, E>,
  options: BinaryHookOptions<P, B>,
): undefined;

export function useResolvedValue<P, B, T, E>(
  hook: BinaryFunctionHook<P, B, T, E>,
  options: BinaryHookOptions<P, B>,
): T | undefined;

// **Implementation**
export function useResolvedValue<P, B, T, E>(
  hook: IntrigHook<P, B, T, E>,
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
export function useResolvedCachedValue<E>(
  hook: UnitHook<E>,
  options: UnitHookOptions,
): undefined;

export function useResolvedCachedValue<T, E>(
  hook: ConstantHook<T, E>,
  options: UnitHookOptions,
): T | undefined;

export function useResolvedCachedValue<P, E>(
  hook: UnaryProduceHook<P, E>,
  options: UnaryHookOptions<P>,
): undefined;

export function useResolvedCachedValue<P, T, E>(
  hook: UnaryFunctionHook<P, T, E>,
  options: UnaryHookOptions<P>,
): T | undefined;

export function useResolvedCachedValue<P, B, E>(
  hook: BinaryProduceHook<P, B, E>,
  options: BinaryHookOptions<P, B>,
): undefined;

export function useResolvedCachedValue<P, B, T, E>(
  hook: BinaryFunctionHook<P, B, T, E>,
  options: BinaryHookOptions<P, B>,
): T | undefined;

// **Implementation**
export function useResolvedCachedValue<P, B, T, E>(
  hook: IntrigHook<P, B, T, E>,
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
