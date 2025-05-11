import {typescript} from "common";
import * as path from "path";

export function mediaTypeUtilsTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "media-type-utils.ts"))

  return ts`
import { ZodSchema } from 'zod';
import { XMLParser } from 'fast-xml-parser';

type Transformers = {
  [k: string]: <T>(
    request: Request,
    mediaType: string,
    schema: ZodSchema
  ) => Promise<T>;
};

const transformers: Transformers = {};

export function transform<T>(
  request: Request,
  mediaType: string,
  schema: ZodSchema
): Promise<T> {
  if (transformers[mediaType]) {
    return transformers[mediaType](request, mediaType, schema);
  }
  throw new Error(\`Unsupported media type: \` + mediaType);
}

transformers['application/json'] = async (request, mediaType, schema) => {
  return schema.parse(await request.json());
};

transformers['multipart/form-data'] = async (request, mediaType, schema) => {
  let formData = await request.formData();
  let content: Record<string, any> = {};
  formData.forEach((value, key) => {
    if (content[key]) {
      if (!(content[key] instanceof Array)) {
        content[key] = [content[key]];
      }
      content[key].push(value);
    } else {
      content[key] = value
    }
  });
  return schema.parse(content);
};

transformers['application/octet-stream'] = async (
  request,
  mediaType,
  schema
) => {
  return schema.parse(
    new Blob([await request.arrayBuffer()], {
      type: 'application/octet-stream',
    })
  );
};

transformers['application/x-www-form-urlencoded'] = async (
  request,
  mediaType,
  schema
) => {
  let formData = await request.formData();
  let content: Record<string, any> = {};
  formData.forEach((value, key) => (content[key] = value));
  return schema.parse(content);
};

transformers['application/xml'] = async (request, mediaType, schema) => {
  let xmlParser = new XMLParser();
  let content = await xmlParser.parse(await request.text());
  return schema.parse(await content);
};

transformers['text/plain'] = async (request, mediaType, schema) => {
  return schema.parse(await request.text());
};

transformers['text/html'] = async (request, mediaType, schema) => {
  return schema.parse(await request.text());
};

transformers['text/css'] = async (request, mediaType, schema) => {
  return schema.parse(await request.text());
};

transformers['text/javascript'] = async (request, mediaType, schema) => {
  return schema.parse(await request.text());
};

type ResponseTransformers = {
  [k: string]: <T>(
    data: any,
    mediaType: string,
    schema: ZodSchema
  ) => Promise<T>;
};

const responseTransformers: ResponseTransformers = {};

responseTransformers['application/json'] = async (data, mediaType, schema) => {
  return schema.parse(data);
};

responseTransformers['application/xml'] = async (data, mediaType, schema) => {
  let parsed = new XMLParser().parse(data);
  return schema.parse(parsed);
}

export async function transformResponse<T>(
  data: any,
  mediaType: string,
  schema: ZodSchema
): Promise<T> {
  if (responseTransformers[mediaType]) {
    return await responseTransformers[mediaType](data, mediaType, schema);
  }
  return data
}
  `
}
