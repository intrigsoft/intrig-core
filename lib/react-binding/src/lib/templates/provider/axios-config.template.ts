import {IntrigSourceConfig, typescript} from "common";
import * as path from 'path'

export function reactProviderAxiosConfigTemplate(_path: string, apisToSync: IntrigSourceConfig[]) {
  const axiosConfigs = apisToSync.map(a => `
  ${a.id}: createAxiosInstance(configs.defaults, configs['${a.id}']),
  `).join("\n");

  const ts = typescript(path.resolve(_path, "src", "axios-config.ts"))
  return ts`import axios, {
  Axios,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { DefaultConfigs } from './interfaces';

export function createAxiosInstance(
  defaultConfig?: DefaultConfigs,
  config?: DefaultConfigs,
) {
  const axiosInstance = axios.create({
    ...(defaultConfig ?? {}),
    ...(config ?? {}),
  });
  
  async function requestInterceptor(cfg: InternalAxiosRequestConfig) {
    const intermediate = (await defaultConfig?.requestInterceptor?.(cfg)) ?? cfg;
    return config?.requestInterceptor?.(intermediate) ?? intermediate;
  }

  async function responseInterceptor(cfg: AxiosResponse<any>) {
    const intermediate = (await defaultConfig?.responseInterceptor?.(cfg)) ?? cfg;
    return config?.responseInterceptor?.(intermediate) ?? intermediate;
  }

  axiosInstance.interceptors.request.use(requestInterceptor);
  axiosInstance.interceptors.response.use(responseInterceptor, (error) => {
    return Promise.reject(error);
  });
  return axiosInstance;
}

export function createAxiosInstances(configs: any): Record<string, Axios> {
  return {
    ${axiosConfigs}
  };
}
  `
}