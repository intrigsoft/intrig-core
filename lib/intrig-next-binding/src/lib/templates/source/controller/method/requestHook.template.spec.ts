import { requestHookTemplate } from './requestHook.template';
import { typescript } from '@intrig/common';

let ts = typescript('');

describe('requestHook', () => {
  it('should convert delete requests', async () => {
    let { path, content } = requestHookTemplate({
      method: 'delete',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testDelete',
      requestUrl: '/test/delete',
      sourcePath: 'path/to/source',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/useTestDelete.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryProduceHook } from '@intrig/next';
    import { TestDeleteParams as Params } from './TestDelete.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'DELETE /test/delete|  -> ';
    const source = 'test-source';

    function useTestDeleteHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p = {}) => {
          let { ...params } = p;

          dispatch({
            method: 'delete',
            url: ${"`/api/test-source/test/delete`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useTestDeleteHook.key = ${"`${source}: ${operation}`"};

    export const useTestDelete: UnaryProduceHook<Params, _ErrorType> =
      useTestDeleteHook;`.content);
  })
  it('should convert delete request with path variables; makes parameters mandatory', () => {
    let { path, content } = requestHookTemplate({
      method: 'delete',
      variables: [{
        in: 'path',
        name: 'name',
        ref: '#/components/schemas/Name',
      }],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testDelete',
      requestUrl: '/test/delete/{name}',
      sourcePath: 'path/to/source',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/useTestDelete.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryProduceHook } from '@intrig/next';
    import { TestDeleteParams as Params } from './TestDelete.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'DELETE /test/delete/{name}|  -> ';
    const source = 'test-source';

    function useTestDeleteHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p) => {
          let { name, ...params } = p;

          dispatch({
            method: 'delete',
            url: ${"`/api/test-source/test/delete/${name}`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useTestDeleteHook.key = ${"`${source}: ${operation}`"};

    export const useTestDelete: UnaryProduceHook<Params, _ErrorType> =
      useTestDeleteHook;`.content);
  });
  it('should convert get requests with response body; imports response body', async () => {
    let { path, content } = requestHookTemplate({
      method: 'get',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testDelete',
      requestUrl: '/users/get-all',
      sourcePath: 'path/to/source',
      response: 'AllUserResponse',
      responseType: 'application/json',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/useTestDelete.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryFunctionHook } from '@intrig/next';
    import {
      AllUserResponse as Response,
      AllUserResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/AllUserResponse';
    import { TestDeleteParams as Params } from './TestDelete.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'GET /users/get-all|  -> application/json';
    const source = 'test-source';

    function useTestDeleteHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p = {}) => {
          let { ...params } = p;

          dispatch({
            method: 'get',
            url: ${"`/api/test-source/users/get-all`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useTestDeleteHook.key = ${"`${source}: ${operation}`"};

    export const useTestDelete: UnaryFunctionHook<Params, Response, _ErrorType> =
      useTestDeleteHook;`.content);
  })
  it('should generate hook for POST requests with a request body', () => {
    let { path, content } = requestHookTemplate({
      method: 'post',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testCreate',
      requestUrl: '/test/create',
      sourcePath: 'path/to/source',
      requestBody: 'CreateRequest',
      contentType: 'application/json',
      response: 'TestCreateResponse',
      responseType: 'application/json',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testCreate/useTestCreate.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { BinaryFunctionHook } from '@intrig/next';
    import {
      CreateRequest as RequestBody,
      CreateRequestSchema as requestBodySchema,
    } from '@intrig/next/test-source/components/schemas/CreateRequest';
    import {
      TestCreateResponse as Response,
      TestCreateResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/TestCreateResponse';
    import { TestCreateParams as Params } from './TestCreate.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'POST /test/create| application/json -> application/json';
    const source = 'test-source';

    function useTestCreateHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (data: RequestBody, params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (data, p = {}) => {
          let { ...params } = p;

          const validationResult = requestBodySchema.safeParse(data);
          if (!validationResult.success) {
            return validationError(validationResult.error.errors);
          }

          dispatch({
            method: 'post',
            url: ${"`/api/test-source/test/create`"},
            headers: {
              'Content-Type': 'application/json',
            },
            params,
            key: ${"`${source}: ${operation}`"},
            body: encode(data, 'application/json', requestBodySchema),
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useTestCreateHook.key = ${"`${source}: ${operation}`"};

    export const useTestCreate: BinaryFunctionHook<
      Params,
      RequestBody,
      Response,
      _ErrorType
    > = useTestCreateHook;`.content);
  });
  it('should generate hook for POST requests without request body', () => {
    let { path, content } = requestHookTemplate({
      method: 'post',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testCreate',
      requestUrl: '/test/create',
      sourcePath: 'path/to/source',
      response: 'TestCreateResponse',
      responseType: 'application/json',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testCreate/useTestCreate.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryFunctionHook } from '@intrig/next';
    import {
      TestCreateResponse as Response,
      TestCreateResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/TestCreateResponse';
    import { TestCreateParams as Params } from './TestCreate.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'POST /test/create|  -> application/json';
    const source = 'test-source';

    function useTestCreateHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p = {}) => {
          let { ...params } = p;

          dispatch({
            method: 'post',
            url: ${"`/api/test-source/test/create`"},
            headers: {

            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useTestCreateHook.key = ${"`${source}: ${operation}`"};

    export const useTestCreate: UnaryFunctionHook<Params, Response, _ErrorType> =
      useTestCreateHook;`.content);
  });
  it('should generate hook for requests with multiple path variables', () => {
    let { path, content } = requestHookTemplate({
      method: 'get',
      variables: [
        { in: 'path', name: 'userId', ref: '#/components/schemas/UserId' },
        { in: 'path', name: 'postId', ref: '#/components/schemas/PostId' },
      ],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'getUserPost',
      requestUrl: '/user/{userId}/post/{postId}',
      sourcePath: 'path/to/source',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/getUserPost/useGetUserPost.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryProduceHook } from '@intrig/next';
    import { GetUserPostParams as Params } from './GetUserPost.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'GET /user/{userId}/post/{postId}|  -> ';
    const source = 'test-source';

    function useGetUserPostHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p) => {
          let { userId, postId, ...params } = p;

          dispatch({
            method: 'get',
            url: ${"`/api/test-source/user/${userId}/post/${postId}`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useGetUserPostHook.key = ${"`${source}: ${operation}`"};

    export const useGetUserPost: UnaryProduceHook<Params, _ErrorType> =
      useGetUserPostHook;`.content);
  });
  it('should generate hook for requests with an error response schema', () => {
    let { path, content } = requestHookTemplate({
      method: 'post',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'createUser',
      requestUrl: '/user/create',
      sourcePath: 'path/to/source',
      requestBody: 'CreateUserRequest',
      contentType: 'application/json',
      response: 'TestCreateResponse',
      responseType: 'application/json',
      errorResponses: {
        400: { response: 'ValidationError' },
        500: { response: 'InternalServerError' },
      },
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/createUser/useCreateUser.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { BinaryFunctionHook } from '@intrig/next';
    import {
      CreateUserRequest as RequestBody,
      CreateUserRequestSchema as requestBodySchema,
    } from '@intrig/next/test-source/components/schemas/CreateUserRequest';
    import {
      TestCreateResponse as Response,
      TestCreateResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/TestCreateResponse';
    import { CreateUserParams as Params } from './CreateUser.params';
    import {
      ValidationError,
      ValidationErrorSchema,
    } from '@intrig/next/test-source/components/schemas/ValidationError';
    import {
      InternalServerError,
      InternalServerErrorSchema,
    } from '@intrig/next/test-source/components/schemas/InternalServerError';

    export type _ErrorType = ValidationError | InternalServerError;
    const errorSchema = z.union([ValidationErrorSchema, InternalServerErrorSchema]);

    const operation = 'POST /user/create| application/json -> application/json';
    const source = 'test-source';

    function useCreateUserHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (data: RequestBody, params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (data, p = {}) => {
          let { ...params } = p;

          const validationResult = requestBodySchema.safeParse(data);
          if (!validationResult.success) {
            return validationError(validationResult.error.errors);
          }

          dispatch({
            method: 'post',
            url: ${"`/api/test-source/user/create`"},
            headers: {
              'Content-Type': 'application/json',
            },
            params,
            key: ${"`${source}: ${operation}`"},
            body: encode(data, 'application/json', requestBodySchema),
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useCreateUserHook.key = ${"`${source}: ${operation}`"};

    export const useCreateUser: BinaryFunctionHook<
      Params,
      RequestBody,
      Response,
      _ErrorType
    > = useCreateUserHook;`.content);
  });
  it('should generate hook for requests with query parameters', () => {
    let { path, content } = requestHookTemplate({
      method: 'get',
      variables: [
        { in: 'query', name: 'page', ref: '#/components/schemas/Page' },
        { in: 'query', name: 'size', ref: '#/components/schemas/Size' },
      ],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'listUsers',
      requestUrl: '/users',
      sourcePath: 'path/to/source',
      response: 'UserListResponse',
      responseType: 'application/json',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/listUsers/useListUsers.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryFunctionHook } from '@intrig/next';
    import {
      UserListResponse as Response,
      UserListResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/UserListResponse';
    import { ListUsersParams as Params } from './ListUsers.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'GET /users|  -> application/json';
    const source = 'test-source';

    function useListUsersHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p = {}) => {
          let { ...params } = p;

          dispatch({
            method: 'get',
            url: ${"`/api/test-source/users`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useListUsersHook.key = ${"`${source}: ${operation}`"};

    export const useListUsers: UnaryFunctionHook<Params, Response, _ErrorType> =
      useListUsersHook;`.content);
  });
  it('should generate hook for GET requests without a response schema', () => {
    let { path, content } = requestHookTemplate({
      method: 'get',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'fetchData',
      requestUrl: '/data/fetch',
      sourcePath: 'path/to/source',
    });

    expect(path.endsWith('path/to/source/src/test-source/test-controller/fetchData/useFetchData.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z } from 'zod';
    import {
      useNetworkState,
      NetworkState,
      DispatchState,
      error,
      successfulDispatch,
      validationError,
      encode,
    } from '@intrig/next';
    import { UnaryProduceHook } from '@intrig/next';
    import { FetchDataParams as Params } from './FetchData.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    const operation = 'GET /data/fetch|  -> ';
    const source = 'test-source';

    function useFetchDataHook(
      key: string = 'default'
    ): [
      NetworkState<Response, _ErrorType>,
      (params?: Params) => DispatchState<any>,
      () => void
    ] {
      let [state, dispatch, clear] = useNetworkState<Response, _ErrorType>({
        key,
        operation,
        source,
        schema,
        errorSchema,
      });

      return [
        state,
        (p = {}) => {
          let { ...params } = p;

          dispatch({
            method: 'get',
            url: ${"`/api/test-source/data/fetch`"},
            headers: {
            },
            params,
            key: ${"`${source}: ${operation}`"},
          });
          return successfulDispatch();
        },
        clear,
      ];
    }

    useFetchDataHook.key = ${"`${source}: ${operation}`"};

    export const useFetchData: UnaryProduceHook<Params, _ErrorType> =
      useFetchDataHook;`.content);
  });

})
