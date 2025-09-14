import { IntrigSourceConfig, typescript } from "@intrig/plugin-sdk";
import * as path from 'path';

export function reactIntrigProviderStubTemplate(_apisToSync: IntrigSourceConfig[]) {
  const ts = typescript(path.resolve('src', 'intrig-provider-stub.tsx'));
  return ts`import { useMemo, useReducer } from 'react';
import { ZodSchema } from 'zod';
import { Context, RequestType, GlobalState } from './intrig-context';
import { IntrigProviderStubProps } from './interfaces';
import { error, configError, init, NetworkState } from './network-state';
import { requestReducer } from './reducer';

export function IntrigProviderStub({
  children,
  configs,
  stubs = () => {
    //intentionally left blank
  },
}: IntrigProviderStubProps) {
  const [state, dispatch] = useReducer(requestReducer, {} as GlobalState);

  const collectedStubs = useMemo(() => {
    const fns: Record<string, (
      params: any,
      body: any,
      dispatch: (state: NetworkState<any>) => void,
    ) => Promise<void>> = {};
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
      const stub = collectedStubs[request.key];

      if (stub) {
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
`;
}