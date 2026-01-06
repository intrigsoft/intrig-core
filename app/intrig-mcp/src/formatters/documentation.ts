/**
 * Documentation formatter for converting daemon API responses to markdown.
 * Combines Tab[] arrays into single markdown documents with proper headers.
 */

import {
  Tab,
  RestDocumentation,
  SchemaDocumentation,
  RelatedType,
  RelatedEndpoint,
} from '../types/daemon-api.js';

// ============================================================================
// Tab Formatting
// ============================================================================

/**
 * Format a single tab as a markdown section.
 */
function formatTab(tab: Tab): string {
  return `## ${tab.name}\n\n${tab.content}`;
}

/**
 * Combine multiple tabs into a markdown document.
 */
export function formatTabs(tabs: Tab[]): string {
  if (tabs.length === 0) {
    return '';
  }

  return tabs.map(formatTab).join('\n\n');
}

// ============================================================================
// Endpoint Documentation
// ============================================================================

/**
 * Format the metadata header for an endpoint.
 */
function formatEndpointHeader(doc: RestDocumentation, source?: string): string {
  const lines: string[] = [];

  lines.push(`# ${doc.name}`);
  lines.push('');

  // Metadata table
  if (source) {
    lines.push(`**Source:** ${source}`);
  }
  lines.push(`**Method:** \`${doc.method}\``);
  lines.push(`**Path:** \`${doc.path}\``);

  if (doc.description) {
    lines.push('');
    lines.push(doc.description);
  }

  return lines.join('\n');
}

/**
 * Format request/response type references.
 */
function formatTypeReferences(doc: RestDocumentation): string {
  const sections: string[] = [];

  if (doc.requestBody) {
    sections.push(`**Request Body:** ${doc.requestBody.name}`);
  }

  if (doc.response) {
    sections.push(`**Response:** ${doc.response.name}`);
  }

  if (doc.contentType) {
    sections.push(`**Content-Type:** \`${doc.contentType}\``);
  }

  if (doc.responseType) {
    sections.push(`**Response Type:** \`${doc.responseType}\``);
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n');
}

/**
 * Format endpoint documentation as a complete markdown document.
 *
 * @param doc - REST documentation from daemon API
 * @param source - Optional source identifier for display
 */
export function formatEndpointDocumentation(
  doc: RestDocumentation,
  source?: string
): string {
  const sections: string[] = [];

  // Header with metadata
  sections.push(formatEndpointHeader(doc, source));

  // Type references
  const typeRefs = formatTypeReferences(doc);
  if (typeRefs) {
    sections.push('');
    sections.push(typeRefs);
  }

  // Request URL
  if (doc.requestUrl) {
    sections.push('');
    sections.push(`**Request URL:** \`${doc.requestUrl}\``);
  }

  // Tabs content
  if (doc.tabs.length > 0) {
    sections.push('');
    sections.push(formatTabs(doc.tabs));
  }

  return sections.join('\n');
}

/**
 * Extract related types from endpoint documentation for drill-down.
 */
export function extractEndpointRelatedTypes(
  doc: RestDocumentation
): RelatedType[] {
  const types: RelatedType[] = [];

  if (doc.requestBody) {
    types.push(doc.requestBody);
  }

  if (doc.response) {
    types.push(doc.response);
  }

  // Extract from variables
  for (const variable of doc.variables) {
    if (variable.relatedType) {
      types.push(variable.relatedType);
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return types.filter((t) => {
    if (seen.has(t.id)) {
      return false;
    }
    seen.add(t.id);
    return true;
  });
}

// ============================================================================
// Schema Documentation
// ============================================================================

/**
 * Format the metadata header for a schema.
 */
function formatSchemaHeader(doc: SchemaDocumentation, source?: string): string {
  const lines: string[] = [];

  lines.push(`# ${doc.name}`);
  lines.push('');

  if (source) {
    lines.push(`**Source:** ${source}`);
  }

  if (doc.description) {
    lines.push('');
    lines.push(doc.description);
  }

  return lines.join('\n');
}

/**
 * Format JSON schema as a code block.
 */
function formatJsonSchema(schema: Record<string, unknown>): string {
  const lines: string[] = [];

  lines.push('## JSON Schema');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(schema, null, 2));
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format related types as a markdown list.
 */
function formatRelatedTypes(types: RelatedType[]): string {
  if (types.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Related Types');
  lines.push('');

  for (const type of types) {
    lines.push(`- ${type.name} (\`${type.id}\`)`);
  }

  return lines.join('\n');
}

/**
 * Format related endpoints as a markdown list.
 */
function formatRelatedEndpoints(endpoints: RelatedEndpoint[]): string {
  if (endpoints.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Related Endpoints');
  lines.push('');

  for (const endpoint of endpoints) {
    lines.push(`- \`${endpoint.method}\` ${endpoint.path} - ${endpoint.name}`);
  }

  return lines.join('\n');
}

/**
 * Format schema documentation as a complete markdown document.
 *
 * @param doc - Schema documentation from daemon API
 * @param source - Optional source identifier for display
 */
export function formatSchemaDocumentation(
  doc: SchemaDocumentation,
  source?: string
): string {
  const sections: string[] = [];

  // Header with metadata
  sections.push(formatSchemaHeader(doc, source));

  // JSON Schema
  if (doc.jsonSchema && Object.keys(doc.jsonSchema).length > 0) {
    sections.push('');
    sections.push(formatJsonSchema(doc.jsonSchema));
  }

  // Tabs content
  if (doc.tabs.length > 0) {
    sections.push('');
    sections.push(formatTabs(doc.tabs));
  }

  // Related types
  const relatedTypes = formatRelatedTypes(doc.relatedTypes);
  if (relatedTypes) {
    sections.push('');
    sections.push(relatedTypes);
  }

  // Related endpoints
  const relatedEndpoints = formatRelatedEndpoints(doc.relatedEndpoints);
  if (relatedEndpoints) {
    sections.push('');
    sections.push(relatedEndpoints);
  }

  return sections.join('\n');
}

// ============================================================================
// Inline Schema Extraction
// ============================================================================

/**
 * Extract TypeScript type definition from schema tabs.
 * Looks for "Typescript Type" tab and extracts the code block.
 */
export function extractTypeScriptDefinition(doc: SchemaDocumentation): string | null {
  // Find the TypeScript type tab
  const tsTab = doc.tabs.find(
    (tab) => tab.name === 'Typescript Type' || tab.name === 'TypeScript Type'
  );

  if (!tsTab) {
    return null;
  }

  // Extract the Definition code block
  const definitionMatch = tsTab.content.match(
    /## Definition\s*\n+```ts\n([\s\S]*?)```/
  );

  if (definitionMatch && definitionMatch[1]) {
    return definitionMatch[1].trim();
  }

  // Fallback: try to find any TypeScript code block
  const codeBlockMatch = tsTab.content.match(/```ts\n([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  return null;
}

/**
 * Format inline schema definitions for endpoint documentation.
 */
function formatInlineSchemas(
  schemas: Map<string, SchemaDocumentation>,
  requestBodyType?: RelatedType,
  responseType?: RelatedType
): string {
  const sections: string[] = [];

  // Response schema first (more commonly needed)
  if (responseType && schemas.has(responseType.id)) {
    const responseSchema = schemas.get(responseType.id)!;
    const tsDefinition = extractTypeScriptDefinition(responseSchema);

    if (tsDefinition) {
      sections.push('## Response Type Definition');
      sections.push('');
      sections.push(`\`${responseType.name}\``);
      sections.push('');
      sections.push('```typescript');
      sections.push(tsDefinition);
      sections.push('```');

      // Add related types from response schema (1 level deep)
      if (responseSchema.relatedTypes.length > 0) {
        const inlinedRelated: string[] = [];
        for (const related of responseSchema.relatedTypes.slice(0, 5)) {
          if (schemas.has(related.id)) {
            const relatedDef = extractTypeScriptDefinition(schemas.get(related.id)!);
            if (relatedDef) {
              inlinedRelated.push(`// ${related.name}`);
              inlinedRelated.push(relatedDef);
              inlinedRelated.push('');
            }
          }
        }
        if (inlinedRelated.length > 0) {
          sections.push('');
          sections.push('### Nested Types');
          sections.push('');
          sections.push('```typescript');
          sections.push(inlinedRelated.join('\n').trim());
          sections.push('```');
        }
      }
    }
  }

  // Request body schema
  if (requestBodyType && schemas.has(requestBodyType.id)) {
    const requestSchema = schemas.get(requestBodyType.id)!;
    const tsDefinition = extractTypeScriptDefinition(requestSchema);

    if (tsDefinition) {
      if (sections.length > 0) {
        sections.push('');
      }
      sections.push('## Request Body Type Definition');
      sections.push('');
      sections.push(`\`${requestBodyType.name}\``);
      sections.push('');
      sections.push('```typescript');
      sections.push(tsDefinition);
      sections.push('```');
    }
  }

  return sections.join('\n');
}

/**
 * Format endpoint documentation with inlined schema definitions.
 *
 * @param doc - REST documentation from daemon API
 * @param schemas - Map of schema ID to SchemaDocumentation for inlining
 * @param source - Optional source identifier for display
 */
export function formatEndpointDocumentationWithSchemas(
  doc: RestDocumentation,
  schemas: Map<string, SchemaDocumentation>,
  source?: string
): string {
  const sections: string[] = [];

  // Header with metadata
  sections.push(formatEndpointHeader(doc, source));

  // Type references
  const typeRefs = formatTypeReferences(doc);
  if (typeRefs) {
    sections.push('');
    sections.push(typeRefs);
  }

  // Request URL
  if (doc.requestUrl) {
    sections.push('');
    sections.push(`**Request URL:** \`${doc.requestUrl}\``);
  }

  // Tabs content
  if (doc.tabs.length > 0) {
    sections.push('');
    sections.push(formatTabs(doc.tabs));
  }

  // Inline schema definitions
  const inlineSchemas = formatInlineSchemas(
    schemas,
    doc.requestBody,
    doc.response
  );
  if (inlineSchemas) {
    sections.push('');
    sections.push(inlineSchemas);
  }

  return sections.join('\n');
}

// ============================================================================
// Generic Documentation Result
// ============================================================================

/**
 * Formatted documentation result for MCP tool responses.
 */
export interface FormattedDocumentation {
  id: string;
  name: string;
  type: 'endpoint' | 'schema';
  source?: string;

  // Endpoint-specific
  method?: string;
  path?: string;

  // Formatted markdown
  documentation: string;

  // For drill-down
  relatedTypes: Array<{ name: string; id: string }>;
  relatedEndpoints: Array<{ name: string; id: string }>;
}

/**
 * Create a formatted documentation result for an endpoint.
 */
export function createEndpointResult(
  doc: RestDocumentation,
  source?: string
): FormattedDocumentation {
  return {
    id: doc.id,
    name: doc.name,
    type: 'endpoint',
    source,
    method: doc.method,
    path: doc.path,
    documentation: formatEndpointDocumentation(doc, source),
    relatedTypes: extractEndpointRelatedTypes(doc),
    relatedEndpoints: [],
  };
}

/**
 * Create a formatted documentation result for an endpoint with inlined schemas.
 */
export function createEndpointResultWithSchemas(
  doc: RestDocumentation,
  schemas: Map<string, SchemaDocumentation>,
  source?: string
): FormattedDocumentation {
  // Get remaining related types that weren't inlined
  const inlinedIds = new Set<string>();
  if (doc.requestBody) inlinedIds.add(doc.requestBody.id);
  if (doc.response) inlinedIds.add(doc.response.id);

  // Also mark nested types as inlined
  if (doc.response && schemas.has(doc.response.id)) {
    const responseSchema = schemas.get(doc.response.id)!;
    for (const related of responseSchema.relatedTypes.slice(0, 5)) {
      if (schemas.has(related.id)) {
        inlinedIds.add(related.id);
      }
    }
  }

  const allRelatedTypes = extractEndpointRelatedTypes(doc);
  const remainingRelatedTypes = allRelatedTypes.filter(
    (t) => !inlinedIds.has(t.id)
  );

  return {
    id: doc.id,
    name: doc.name,
    type: 'endpoint',
    source,
    method: doc.method,
    path: doc.path,
    documentation: formatEndpointDocumentationWithSchemas(doc, schemas, source),
    relatedTypes: remainingRelatedTypes,
    relatedEndpoints: [],
  };
}

/**
 * Create a formatted documentation result for a schema.
 */
export function createSchemaResult(
  doc: SchemaDocumentation,
  source?: string
): FormattedDocumentation {
  return {
    id: doc.id,
    name: doc.name,
    type: 'schema',
    source,
    documentation: formatSchemaDocumentation(doc, source),
    relatedTypes: doc.relatedTypes.map((t) => ({ name: t.name, id: t.id })),
    relatedEndpoints: doc.relatedEndpoints.map((e) => ({
      name: e.name,
      id: e.id,
    })),
  };
}
