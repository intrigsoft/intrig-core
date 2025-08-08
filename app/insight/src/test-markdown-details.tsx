import React from 'react';
import { MarkdownRenderer } from './components/markdown-renderer';

const testMarkdown = `
# Markdown Details Test

This is a test of the markdown details rendering.

<details>
<summary>Click to expand</summary>

This is the content inside the details block.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
const test = "Hello World";
console.log(test);
\`\`\`

</details>

<details>
<summary>Another expandable section</summary>

## Nested heading

This details block contains a nested heading and a table:

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |

</details>
`;

export default function TestMarkdownDetails() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Markdown Details Block Test</h1>
      <MarkdownRenderer content={testMarkdown} />
    </div>
  );
}