import { typescript } from 'common';
import * as path from 'path'

export function intrigMiddlewareTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, 'src', 'intrig-middleware.ts'))

  return ts`
import axios, {AxiosInstance} from 'axios';
import {headers} from 'next/headers';

interface RequestContext {
  headers?: Record<string, string>;
}

const CONTEXT = new WeakMap<Headers, RequestContext>();

export async function addToHeaders(newHeaders: Record<string, string>) {
  const _headers = await headers();

  const ctx = CONTEXT.get(_headers) ?? {};
  CONTEXT.set(_headers, {
    ...ctx,
    headers: {
      ...ctx.headers,
      ...newHeaders
    }
  });
}

export async function getHeaders() {
  const _headers = await headers();
  const ctx = CONTEXT.get(_headers) ?? {};
  return ctx.headers;
}

const clients = new Map<string, AxiosInstance>();

export async function getAxiosInstance(key: string) {
  if (clients.has(key)) {
    return clients.get(key);
  }
  const baseURL = process.env[${"`${key.toUpperCase()}_API_URL`"}];
  if (!baseURL) {
    throw new Error(
      ${"`Environment variable ${key.toUpperCase()}_API_URL is not defined.`"},
    );
  }

  const axiosInstance = axios.create({
    baseURL
  });
  clients.set(key, axiosInstance);
  return axiosInstance;
}

export async function addResponseToHydrate(key: string, responseData: any) {
  const _headers = await headers();
  const intrigHydrated = _headers.get('INTRIG_HYDRATED');
  const ob = intrigHydrated ? JSON.parse(intrigHydrated) : {};
  ob[key] = responseData;
  _headers.set('INTRIG_HYDRATED', JSON.stringify(ob));
}
`
}
