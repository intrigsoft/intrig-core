import {ResourceDescriptor, Schema, typescript, markdown} from "@intrig/plugin-sdk";
import * as path from 'path';
import {openApiSchemaToTypeScript} from "../type/typeTemplate.js";

export async function schemaTypescriptDoc(result: ResourceDescriptor<Schema>) {
  const {
    data: {
      name,
      schema
    },
    source
  } = result

  const {tsType} = openApiSchemaToTypeScript(result.data.schema);

  const ts = typescript(path.resolve('src', source, 'temp', name, `${name}.ts`))

  const importContent = await ts`
import { ${name} } from '@intrig/nest/components/schemas/${name}';
  `

  const md = markdown('');

  return md`
\`\`\`typescript
${importContent.content}

type Example = ${tsType}
\`\`\`
  `
}

export async function schemaJsonSchemaDoc(result: ResourceDescriptor<Schema>) {
  const {
    data: {
      name,
      schema
    },
    source
  } = result

  const ts = typescript(path.resolve('src', source, 'temp', name, `${name}.ts`))

  const importContent = await ts`
import { ${name}_jsonschema } from '@intrig/nest/components/schemas/${name}';
  `

  const md = markdown('');

  return md`
\`\`\`typescript
${importContent.content}

console.log(${name}_jsonschema)
\`\`\`

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`
  `
}
