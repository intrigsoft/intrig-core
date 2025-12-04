import {ResourceDescriptor, RestData, typescript, markdown, camelCase} from "@intrig/plugin-sdk";
import * as path from 'path';

export async function nestServiceMethodDocs(result: ResourceDescriptor<RestData>) {
  const {
    data: {
      operationId,
      method,
      paths,
      requestBody,
      response,
      variables
    },
    source
  } = result

  const methodName = camelCase(operationId);

  const ts = typescript(path.resolve('src', source, 'temp', operationId, `${operationId}.ts`))

  // Build example usage
  let exampleParams: string[] = [];
  let exampleCall = '';

  if (variables && variables.length > 0) {
    variables.forEach(v => {
      exampleParams.push(`// ${v.in} parameter\nconst ${camelCase(v.name)} = ...;`);
    });
  }

  if (requestBody) {
    exampleParams.push(`// request body\nconst data = ...;`);
  }

  const callParams = [...(variables?.map(v => camelCase(v.name)) || []), requestBody ? 'data' : ''].filter(Boolean);
  exampleCall = `const result = await service.${methodName}(${callParams.join(', ')});`;

  const importContent = await ts`
import { SomeService } from '@intrig/nest';

// Inject the service in your controller or another service
constructor(private readonly service: SomeService) {}

// Usage example
${exampleParams.join('\n')}
${exampleCall}
  `

  const md = markdown('');

  return md`
\`\`\`typescript
${importContent.content}
\`\`\`

**Endpoint Details:**
- Method: \`${method.toUpperCase()}\`
- Path: \`${paths[0] || ''}\`
${requestBody ? `- Request Body Type: \`${requestBody}\`` : ''}
${response ? `- Response Type: \`${response}\`` : ''}
  `
}
