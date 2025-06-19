import { ZodSchema } from 'zod';
import { XMLParser } from 'fast-xml-parser';

// type Encoders = {
//   [k: string]: <T>(
//     request: T,
//     mediaType: string,
//     schema: ZodSchema,
//   ) => Promise<any>;
// };

type EncodersSync = {
  [k: string]: <T>(request: T, mediaType: string, schema: ZodSchema) => any;
};

const encoders: EncodersSync = {};

export function encode<T>(request: T, mediaType: string, schema: ZodSchema) {
  if (encoders[mediaType]) {
    return encoders[mediaType](request, mediaType, schema);
  }
  return request;
}

encoders['application/json'] = (request, mediaType, schema) => {
  return request;
};

function appendFormData(
  formData: FormData,
  data: any,
  parentKey: string,
): void {
  if (data instanceof Blob || typeof data === 'string') {
    formData.append(parentKey, data);
  } else if (data !== null && typeof data === 'object') {
    if (Array.isArray(data)) {
      data.forEach((item: any, index: number) => {
        const key = `${parentKey}`;
        appendFormData(formData, item, key);
      });
    } else {
      Object.keys(data).forEach((key: string) => {
        const newKey = parentKey ? `${parentKey}[${key}]` : key;
        appendFormData(formData, data[key], newKey);
      });
    }
  } else {
    formData.append(parentKey, data == null ? '' : String(data));
  }
}

encoders['multipart/form-data'] = (request, mediaType, schema) => {
  let _request = request as Record<string, any>;
  let formData = new FormData();
  Object.keys(_request).forEach((key: string) => {
    appendFormData(formData, _request[key], key);
  });
  return formData;
};

encoders['application/octet-stream'] = (request, mediaType, schema) => {
  return request;
};

encoders['application/x-www-form-urlencoded'] = (
  request,
  mediaType,
  schema,
) => {
  let formData = new FormData();
  for (let key in request) {
    const value = request[key];
    formData.append(
      key,
      value instanceof Blob || typeof value === 'string'
        ? value
        : String(value),
    );
  }
  return formData;
};

type Transformers = {
  [k: string]: <T>(
    request: Request,
    mediaType: string,
    schema: ZodSchema,
  ) => Promise<T>;
};

const transformers: Transformers = {};

export function transform<T>(
  request: Request,
  mediaType: string,
  schema: ZodSchema,
): Promise<T> {
  if (transformers[mediaType]) {
    return transformers[mediaType](request, mediaType, schema);
  }
  throw new Error(`Unsupported media type: ` + mediaType);
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
      content[key] = value;
    }
  });
  return schema.parse(content);
};

transformers['application/octet-stream'] = async (
  request,
  mediaType,
  schema,
) => {
  return schema.parse(
    new Blob([await request.arrayBuffer()], {
      type: 'application/octet-stream',
    }),
  );
};

transformers['application/x-www-form-urlencoded'] = async (
  request,
  mediaType,
  schema,
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
    schema: ZodSchema,
  ) => Promise<T>;
};

const responseTransformers: ResponseTransformers = {};

responseTransformers['application/json'] = async (data, mediaType, schema) => {
  return schema.parse(data);
};

responseTransformers['application/xml'] = async (data, mediaType, schema) => {
  let parsed = new XMLParser().parse(data);
  return schema.parse(parsed);
};

export async function transformResponse<T>(
  data: any,
  mediaType: string,
  schema: ZodSchema,
): Promise<T> {
  if (responseTransformers[mediaType]) {
    return await responseTransformers[mediaType](data, mediaType, schema);
  }
  return data;
}
