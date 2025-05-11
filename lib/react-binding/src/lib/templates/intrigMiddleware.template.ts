import { typescript } from 'common';
import * as path from 'path'

export function intrigMiddlewareTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, 'src', 'intrig-middleware.ts'))

  return ts`
import axios from 'axios';
import { requestInterceptor } from 'intrig-hook';

export function getAxiosInstance(key: string) {
  let axiosInstance = axios.create({
    baseURL: process.env[${"`${key.toUpperCase()}_API_URL`"}],
  });

  axiosInstance.interceptors.request.use(requestInterceptor);

  return axiosInstance;
}
`
}
