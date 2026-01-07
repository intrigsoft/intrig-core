/**
 * MCP server instructions for Intrig.
 * Clarifies CLI vs MCP scope and provides framework-specific setup guidance.
 */

export const SERVER_INSTRUCTIONS = `# Intrig MCP Server

## Tool Scope

**CLI (mutations)**: Project setup, configuration changes, code generation
**MCP (discovery)**: Query generated SDK content, search endpoints/schemas, get documentation

MCP is read-only. It queries the Intrig daemon but cannot modify projects.

### CLI Responsibilities
- \`intrig init\` - Initialize project
- \`intrig source add/remove\` - Manage API sources
- \`intrig sync\` - Download/update OpenAPI specs
- \`intrig generate\` - Generate typed SDK code
- \`intrig daemon\` - Start background service

### MCP Capabilities
- List registered projects
- Get project details and sources
- Search generated endpoints and schemas
- Retrieve full documentation with types

## Setup Workflow (CLI)

For new projects, guide users through these commands:

\`\`\`bash
npx intrig init                          # Create intrig.config.ts
npx intrig source add <name> <url>       # Add OpenAPI spec URL
npx intrig sync --all                    # Download all specs
npx intrig generate                      # Generate SDK
npx intrig daemon                        # Start daemon (optional, auto-starts)
\`\`\`

## Troubleshooting

**If search returns no results or project has no sources:**
1. Verify sources exist: user should run \`npx intrig source list\`
2. Sync schemas: \`npx intrig sync --all\`
3. Regenerate SDK: \`npx intrig generate\`
4. Restart daemon if needed: \`npx intrig daemon --restart\`

**If daemon not running:**
MCP tools auto-start the daemon, but if issues persist: \`npx intrig daemon\`

## Framework Setup

### React
\`\`\`bash
npm install @intrig/react
\`\`\`

\`\`\`tsx
// App root
import { IntrigProvider } from '@intrig/react';

<IntrigProvider>
  <App />
</IntrigProvider>
\`\`\`

Imports: \`import { useGetUsers } from '@intrig/react/<source>/<operation>'\`

### Next.js
\`\`\`bash
npm install @intrig/next
\`\`\`

\`\`\`tsx
// layout.tsx or _app.tsx
import { IntrigProvider } from '@intrig/next';

<IntrigProvider>
  {children}
</IntrigProvider>
\`\`\`

Imports: \`import { useGetUsers } from '@intrig/next/<source>/<operation>'\`

Server components can use generated fetch functions directly without hooks.

### NestJS (Coming Soon)
Server-side client generation for NestJS is planned.

## MCP Tool Flow

Typical discovery workflow:
1. \`list_projects\` - Find Intrig projects
2. \`get_project\` - Get sources for a project
3. \`search\` - Find endpoints by keyword (e.g., "user", "POST /orders")
4. \`get_documentation\` - Get full details with request/response types

If steps 2-4 return empty results, the SDK likely hasn't been generated. Guide users to run CLI commands above.
`;
