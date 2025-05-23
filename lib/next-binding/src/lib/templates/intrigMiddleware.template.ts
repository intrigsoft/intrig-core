import { typescript } from 'common';
import * as path from 'path'

export function intrigMiddlewareTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, 'src', 'intrig-middleware.ts'))

  return ts`
import axios from 'axios';
import {headers} from "next/headers";
//@ts-ignore
let insightHook = await import('intrig-hook')

export async function getAxiosInstance(key: string) {
  const baseURL = process.env[${"`${key.toUpperCase()}_API_URL`"}];
  if (!baseURL) {
    throw new Error(${"`Environment variable ${key.toUpperCase()}_API_URL is not defined.`"});
  }

  const axiosInstance = axios.create({ baseURL });

  if (insightHook?.requestInterceptor) {
    axiosInstance.interceptors.request.use(insightHook.requestInterceptor);
  }

  return axiosInstance;
}

export async function addResponseToHydrate(key: string, responseData: any) {
  let _headers = await headers();
  let intrigHydrated = _headers.get('INTRIG_HYDRATED');
  let ob = intrigHydrated ? JSON.parse(intrigHydrated) : {};
  ob[key] = responseData;
  _headers.set('INTRIG_HYDRATED', JSON.stringify(ob));
}
`
}
