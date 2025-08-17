import {typescript} from "common";
import * as path from 'path'

export function reactProviderReducerTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "reducer.ts"))
  return ts`import {
  NetworkAction,
} from './network-state';
import { GlobalState } from './intrig-context';

/**
 * Handles state updates for network requests based on the provided action.
 *
 * @param {GlobalState} state - The current state of the application.
 * @param {NetworkAction<unknown>} action - The action containing source, operation, key, and state.
 * @return {GlobalState} - The updated state after applying the action.
 */
export function requestReducer(
  state: GlobalState,
  action: NetworkAction<unknown>,
): GlobalState {
  return {
    ...state,
    [${"`${action.source}:${action.operation}:${action.key}`"}]: action.state,
  };
}

function inferNetworkReason(e: any): 'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown' {
  if (e?.code === 'ECONNABORTED') return 'timeout';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (e?.name === 'AbortError') return 'aborted';
  return 'unknown';
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

export { inferNetworkReason, debounce };
  `
}