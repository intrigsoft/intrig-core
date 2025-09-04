import { typescript } from "@intrig/plugin-sdk";
import * as path from 'path'

export function intrigMiddlewareTemplate() {
  const ts = typescript(path.resolve('src', 'intrig-middleware.ts'))

  return ts`
import axios, {AxiosInstance} from 'axios';
import {NextRequest, NextResponse} from 'next/server';
import {headers} from 'next/headers';

type HeadersFunction = (request: NextRequest) => Promise<Record<string, string>>;

// Main middleware function that accepts a headers function and attaches headers with 'intrig-' prefix
export function createIntrigMiddleware(headersFunction: HeadersFunction) {
  return async function middleware(request: NextRequest) {
    try {
      const customHeaders = await headersFunction(request);
      
      // Clone the request headers
      const requestHeaders = new Headers(request.headers);
      
      // Add custom headers with 'intrig-' prefix
      Object.entries(customHeaders).forEach(([key, value]) => {
        requestHeaders.set(${"`intrig-${key}`"}, value);
      });

      // Create a new request with the modified headers
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return response;
    } catch (error) {
      console.error('Error in intrig middleware:', error);
      return NextResponse.next();
    }
  };
}

export async function getHeaders() {
  const _headers = await headers();
  const intrigHeaders: Record<string, string> = {};
  
  // Extract headers with 'intrig-' prefix
  _headers.forEach((value, key) => {
    if (key.startsWith('intrig-')) {
      const originalKey = key.replace('intrig-', '');
      intrigHeaders[originalKey] = value;
    }
  });
  
  return intrigHeaders;
}

const clients = new Map<string, AxiosInstance>();

export async function getAxiosInstance(key: string) {
  if (clients.has(key)) {
    return clients.get(key)!;
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
