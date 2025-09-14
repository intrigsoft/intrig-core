import { IntrigSourceConfig, typescript } from "@intrig/plugin-sdk";
import * as path from 'path';

export function reactStatusTrapTemplate(_apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve('src', 'status-trap.tsx'));
  return ts`import React, { PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { isError, isPending, NetworkState } from './network-state';
import { Context } from './intrig-context';
import { StatusTrapProps } from './interfaces';

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
      const composite = ${"`${event.source}:${event.operation}:${event.key}`"};
      if (!event.handled) {
        if (shouldHandleEvent(event.state)) {
          setRequests((prev) => [...prev, composite]);
          if (!propagate) {
            ctx.dispatch({
              ...event,
              handled: true,
            });
            return;
          }
        } else {
          setRequests((prev) => prev.filter((k) => k !== composite));
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
`;
}