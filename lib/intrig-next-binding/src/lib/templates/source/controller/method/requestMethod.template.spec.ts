import { typescript } from '@intrig/common';
import { requestMethodTemplate } from './requestMethod.template';

let ts = typescript('')

describe('requestMethod', () => {
  it('should convert delete requests', async () => {
    let { path, content } = requestMethodTemplate({
      method: 'delete',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testDelete',
      requestUrl: '/test/delete',
      sourcePath: 'path/to/source',
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/testDelete.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import { TestDeleteParams as Params } from './TestDelete.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeTestDelete: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/test/delete\`,
        headers: {
        },
        params,
      });

      return transformResponse(responseData, '', schema);
    };

    export const testDelete: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      try {
        return executeTestDelete(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should convert delete request with path variables; makes parameters mandatory', () => {
    let { path, content } = requestMethodTemplate({
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
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/testDelete.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import { TestDeleteParams as Params } from './TestDelete.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeTestDelete: (params: Params) => Promise<Response> = async (
      p
    ) => {
      let { name, ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: ${"`/api/test-source/test/delete/${name}`"},
        headers: {
        },
        params,
      });

      return transformResponse(responseData, '', schema);
    };

    export const testDelete: (params: Params) => Promise<Response> = async (p) => {
      try {
        return executeTestDelete(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should convert get requests with response body; imports response body', async () => {
    let { path, content } = requestMethodTemplate({
      method: 'get',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testDelete',
      requestUrl: '/users/get-all',
      sourcePath: 'path/to/source',
      response: 'AllUserResponse',
      responseType: 'application/json',
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testDelete/testDelete.ts')).toBeTruthy();

    console.log(content);

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import {
      AllUserResponse as Response,
      AllUserResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/AllUserResponse';
    import { TestDeleteParams as Params } from './TestDelete.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeTestDelete: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/users/get-all\`,
        headers: {
        },
        params,
      });

      return transformResponse(responseData, 'application/json', schema);
    };

    export const testDelete: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      try {
        return executeTestDelete(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for POST requests with a request body', () => {
    let { path, content } = requestMethodTemplate({
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
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testCreate/testCreate.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
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

    export const executeTestCreate: (
      data: RequestBody,
      params?: Params
    ) => Promise<Response> = async (data, p = {}) => {
      requestBodySchema.parse(data);
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/test/create\`,
        headers: {
          'Content-Type': 'application/json',
        },
        params,
        body: encode(data, 'application/json', requestBodySchema),
      });

      return transformResponse(responseData, 'application/json', schema);
    };

    export const testCreate: (
      data: RequestBody,
      params?: Params
    ) => Promise<Response> = async (data, p = {}) => {
      try {
        return executeTestCreate(data, p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for POST requests without request body', () => {
    let { path, content } = requestMethodTemplate({
      method: 'post',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'testCreate',
      requestUrl: '/test/create',
      sourcePath: 'path/to/source',
      response: 'TestCreateResponse',
      responseType: 'application/json',
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/testCreate/testCreate.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import {
      TestCreateResponse as Response,
      TestCreateResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/TestCreateResponse';
    import { TestCreateParams as Params } from './TestCreate.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeTestCreate: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/test/create\`,
        headers: {
        },
        params,
      });

      return transformResponse(responseData, 'application/json', schema);
    };

    export const testCreate: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      try {
        return executeTestCreate(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for requests with multiple path variables', () => {
    let { path, content } = requestMethodTemplate({
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
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/getUserPost/getUserPost.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import { GetUserPostParams as Params } from './GetUserPost.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeGetUserPost: (params: Params) => Promise<Response> = async (
      p
    ) => {
      let { userId, postId, ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: ${"`/api/test-source/user/${userId}/post/${postId}`"},
        headers: {
        },
        params,
      });

      return transformResponse(responseData, '', schema);
    };

    export const getUserPost: (params: Params) => Promise<Response> = async (p) => {
      try {
        return executeGetUserPost(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for requests with an error response schema', () => {
    let { path, content } = requestMethodTemplate({
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
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/createUser/createUser.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
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

    export const executeCreateUser: (
      data: RequestBody,
      params?: Params
    ) => Promise<Response> = async (data, p = {}) => {
      requestBodySchema.parse(data);
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/user/create\`,
        headers: {
          'Content-Type': 'application/json',
        },
        params,
        body: encode(data, 'application/json', requestBodySchema),
      });

      return transformResponse(responseData, 'application/json', schema);
    };

    export const createUser: (
      data: RequestBody,
      params?: Params
    ) => Promise<Response> = async (data, p = {}) => {
      try {
        return executeCreateUser(data, p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for requests with query parameters', () => {
    let { path, content } = requestMethodTemplate({
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
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/listUsers/listUsers.ts')).toBeTruthy();

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import {
      UserListResponse as Response,
      UserListResponseSchema as schema,
    } from '@intrig/next/test-source/components/schemas/UserListResponse';
    import { ListUsersParams as Params } from './ListUsers.params';

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeListUsers: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/users\`,
        headers: {
        },
        params,
      });

      return transformResponse(responseData, 'application/json', schema);
    };

    export const listUsers: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      try {
        return executeListUsers(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
  it('should generate hook for GET requests without a response schema', () => {
    let { path, content } = requestMethodTemplate({
      method: 'get',
      variables: [],
      source: 'test-source',
      paths: ['test-controller'],
      operationId: 'fetchData',
      requestUrl: '/data/fetch',
      sourcePath: 'path/to/source',
    })

    expect(path.endsWith('path/to/source/src/test-source/test-controller/fetchData/fetchData.ts')).toBeTruthy();

    console.log(content);

    expect(content).toEqual(ts`
    import { z, ZodError } from 'zod';
    import { isAxiosError } from 'axios';
    import {
      networkError,
      responseValidationError,
      getAxiosInstance,
      transformResponse,
    } from '@intrig/next';
    import { FetchDataParams as Params } from './FetchData.params';

    type Response = any;
    const schema = z.any();

    export type _ErrorType = any;
    const errorSchema = z.any();

    export const executeFetchData: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      let { ...params } = p;

      let axiosInstance = await getAxiosInstance('test-source');
      let { data: responseData } = await axiosInstance.request({
        method: 'post',
        url: \`/api/test-source/data/fetch\`,
        headers: {
        },
        params,
      });

      return transformResponse(responseData, '', schema);
    };

    export const fetchData: (params?: Params) => Promise<Response> = async (
      p = {}
    ) => {
      try {
        return executeFetchData(p);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          throw networkError(
            transformResponse(e.response.data, 'application/json', errorSchema),
            e.response.status + '',
            e.response.request
          );
        } else if (e instanceof ZodError) {
          throw responseValidationError(e);
        }
        throw e;
      }
    };
    `.content)
  })
});
