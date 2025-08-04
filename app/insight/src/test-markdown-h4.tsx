import React from 'react';
import { MarkdownRenderer } from './components/markdown-renderer';

const testMarkdown = `
# Heading 1
This is a test of the markdown headings rendering.

## Heading 2
This is a level 2 heading.

### Heading 3
This is a level 3 heading.

#### Heading 4
This is a level 4 heading that should be bold, small, and underlined.

#### Another H4 Example
Testing multiple h4 elements to ensure consistent styling.

Regular paragraph text for comparison.
`;

export default function TestMarkdownH4() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Markdown H4 Styling Test</h1>
      <MarkdownRenderer content={testMarkdown} />
    </div>
  );
}