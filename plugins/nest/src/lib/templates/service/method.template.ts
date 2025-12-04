import {ResourceDescriptor, RestData, Variable, camelCase} from "@intrig/plugin-sdk";

interface MethodSignature {
  params: string[];
  returnType: string;
  bodyParam?: string;
}

function extractMethodSignature(
  descriptor: ResourceDescriptor<RestData>,
  imports: Set<string>,
  source: string
): MethodSignature {
  const {data} = descriptor;
  const params: string[] = [];

  // Path and query parameters
  if (data.variables && data.variables.length > 0) {
    const pathParams = data.variables.filter(v => v.in === 'path');
    const queryParams = data.variables.filter(v => v.in === 'query');

    pathParams.forEach(param => {
      const typeName = param.ref.split('/').pop() || 'any';
      imports.add(`import { ${typeName} } from '../components/schemas/${typeName}';`);
      params.push(`${camelCase(param.name)}: ${typeName}`);
    });

    queryParams.forEach(param => {
      const typeName = param.ref.split('/').pop() || 'any';
      imports.add(`import { ${typeName} } from '../components/schemas/${typeName}';`);
      params.push(`${camelCase(param.name)}?: ${typeName}`);
    });
  }

  // Request body
  let bodyParam: string | undefined;
  if (data.requestBody) {
    const bodyType = data.requestBody;
    imports.add(`import { ${bodyType} } from '../components/schemas/${bodyType}';`);
    bodyParam = `data: ${bodyType}`;
    params.push(bodyParam);
  }

  // Return type
  let returnType = 'void';
  if (data.response) {
    returnType = data.response;
    imports.add(`import { ${returnType} } from '../components/schemas/${returnType}';`);
  }

  return {
    params,
    returnType,
    bodyParam
  };
}

function buildUrlExpression(descriptor: ResourceDescriptor<RestData>): string {
  const {data} = descriptor;
  const urlPath = data.paths[0] || '';

  if (!data.variables || data.variables.length === 0) {
    return `'${urlPath}'`;
  }

  const pathParams = data.variables.filter(v => v.in === 'path');
  if (pathParams.length === 0) {
    return `'${urlPath}'`;
  }

  // Replace {param} with ${param}
  let urlTemplate = urlPath;
  pathParams.forEach(param => {
    urlTemplate = urlTemplate.replace(`{${param.name}}`, `\${${camelCase(param.name)}}`);
  });

  return `\`${urlTemplate}\``;
}

function buildRequestConfig(descriptor: ResourceDescriptor<RestData>): string {
  const {data} = descriptor;
  const configParts: string[] = [];

  // Query parameters
  if (data.variables && data.variables.some(v => v.in === 'query')) {
    const queryParams = data.variables.filter(v => v.in === 'query');
    const paramsObj = queryParams.map(p => `${p.name}: ${camelCase(p.name)}`).join(', ');
    configParts.push(`params: { ${paramsObj} }`);
  }

  // Headers
  if (data.contentType) {
    configParts.push(`headers: { 'Content-Type': '${data.contentType}' }`);
  }

  if (configParts.length === 0) {
    return '';
  }

  return `, { ${configParts.join(', ')} }`;
}

export function generateMethodTemplate(
  descriptor: ResourceDescriptor<RestData>,
  imports: Set<string>,
  source: string
): string {
  const {data} = descriptor;
  const methodName = camelCase(data.operationId);
  const signature = extractMethodSignature(descriptor, imports, source);

  const urlExpression = buildUrlExpression(descriptor);
  const configExpression = buildRequestConfig(descriptor);

  const httpMethod = data.method.toLowerCase();
  const hasBody = data.requestBody !== undefined;
  const hasResponse = data.response !== undefined;

  let methodBody: string;

  if (hasResponse) {
    if (hasBody) {
      // POST/PUT/PATCH with body and response
      methodBody = `
  async ${methodName}(${signature.params.join(', ')}): Promise<${signature.returnType}> {
    const response = await firstValueFrom(
      this.httpService.${httpMethod}<${signature.returnType}>(${urlExpression}, data${configExpression})
    );
    return response.data;
  }`;
    } else {
      // GET/DELETE with response
      methodBody = `
  async ${methodName}(${signature.params.join(', ')}): Promise<${signature.returnType}> {
    const response = await firstValueFrom(
      this.httpService.${httpMethod}<${signature.returnType}>(${urlExpression}${configExpression})
    );
    return response.data;
  }`;
    }
  } else {
    if (hasBody) {
      // POST/PUT/PATCH with body but no response
      methodBody = `
  async ${methodName}(${signature.params.join(', ')}): Promise<void> {
    await firstValueFrom(
      this.httpService.${httpMethod}(${urlExpression}, data${configExpression})
    );
  }`;
    } else {
      // GET/DELETE with no response
      methodBody = `
  async ${methodName}(${signature.params.join(', ')}): Promise<void> {
    await firstValueFrom(
      this.httpService.${httpMethod}(${urlExpression}${configExpression})
    );
  }`;
    }
  }

  return methodBody;
}
