import {ResourceDescriptor} from "./resource-descriptor";

export interface Variable {
  name: string
  in: string
  ref: string
}

export interface ErrorResponse {
  response?: string,
  responseType?: string
}

export interface RestData {
  method: string;
  paths: string[];
  operationId: string;
  requestBody?: string;
  contentType?: string;
  response?: string;
  responseType?: string;
  requestUrl?: string;
  variables?: Variable[];
  description?: string;
  summary?: string;
  responseExamples?: Record<string, string>;
  errorResponses?: Record<string, ErrorResponse>;
}

export function isRestDescriptor(descriptor: ResourceDescriptor<any>): descriptor is ResourceDescriptor<RestData> {
  return descriptor.type === 'rest';
}