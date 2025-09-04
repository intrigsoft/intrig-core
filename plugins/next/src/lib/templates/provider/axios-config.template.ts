import {IntrigSourceConfig, typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function providerAxiosConfigTemplate(apisToSync: IntrigSourceConfig[]) {
  const axiosInstances = apisToSync.map(a => `    ${a.id}: axiosInstance,`).join("\n");

  const ts = typescript(path.resolve("src", "axios-config.ts"))
  return ts`import axios, {
  Axios,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { DefaultConfigs } from './interfaces';

export function createAxiosInstance(config?: DefaultConfigs) {
  const axiosInstance = axios.create({
    ...(config ?? {}),
  });
  
  async function requestInterceptor(cfg: InternalAxiosRequestConfig) {
    return config?.requestInterceptor?.(cfg) ?? cfg;
  }

  async function responseInterceptor(cfg: AxiosResponse<any>) {
    return config?.responseInterceptor?.(cfg) ?? cfg;
  }

  axiosInstance.interceptors.request.use(requestInterceptor);
  axiosInstance.interceptors.response.use(responseInterceptor, (error) => {
    return Promise.reject(error);
  });
  return axiosInstance;
}

export function createAxiosInstances(configs?: DefaultConfigs): Record<string, Axios> {
  const axiosInstance = createAxiosInstance(configs);
  return {
${axiosInstances}
  };
}
  `
}