import { Injectable, Scope } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import * as z from "zod";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import { Page, ResourceDescriptor, RestDocumentation, SchemaDocumentation } from "common";
import { ProcessManagerService } from "../cli/process-manager.service";

/**
 * AiResource exposes a minimal, AI-friendly interface with only two tools:
 * - ai-search: unified search across endpoints and data types (schemas)
 * - ai-view: single, concatenated documentation for a specific resource
 */
@Injectable({ scope: Scope.REQUEST })
export class AiResource {
  constructor(private pm: ProcessManagerService, private httpService: HttpService) {}

  @Tool({
    name: "ai-search",
    description:
      "Unified search across endpoints (type: 'endpoint') and data types (type: 'schema'). Returns items with id, type, name, and source/path info.",
    parameters: z.object({
      query: z.string().describe("Search text across endpoints and data types"),
      page: z.number().optional().default(1),
      size: z.number().optional().default(20),
    }),
    outputSchema: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
      data: z.array(
        z.object({
          id: z.string(),
          type: z.enum(["endpoint", "schema"]).describe("Resource type"),
          name: z.string(),
          source: z.string().optional(),
          path: z.string().optional(),
        })
      ),
    }),
  })
  async aiSearch({ query, page = 1, size = 20 }: { query: string; page?: number; size?: number }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        total: 0,
        page: 1,
        limit: size,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        data: [],
      };
    }

    // Fetch endpoints (rest) and schemas separately, then merge results
    const [restRes, schemaRes] = await Promise.all([
      lastValueFrom(
        this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
          params: { query, page, size, type: "rest" },
        })
      ).then((a) => a.data),
      lastValueFrom(
        this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
          params: { query, page, size, type: "schema" },
        })
      ).then((a) => a.data),
    ]);

    // Merge the two sets. For simplicity, we concatenate data and sum totals (approximation).
    const data = [
      ...(restRes?.data || []).map((r) => ({
        id: r.id,
        type: "endpoint" as const,
        name: r.name,
        source: r.source,
        path: r.path,
      })),
      ...(schemaRes?.data || []).map((r) => ({
        id: r.id,
        type: "schema" as const,
        name: r.name,
        source: r.source,
        path: r.path,
      })),
    ];

    const total = (restRes?.total || 0) + (schemaRes?.total || 0);
    const limit = size;
    // We cannot perfectly compute totalPages/hasNext across two datasets; approximate conservatively
    const totalPages = Math.max(restRes?.totalPages || 0, schemaRes?.totalPages || 0);
    const hasNext = (restRes?.hasNext || false) || (schemaRes?.hasNext || false);
    const hasPrevious = page > 1;

    return { total, page, limit, totalPages, hasNext, hasPrevious, data };
  }

  @Tool({
    name: "ai-view",
    description:
      "View unified, concatenated documentation for a resource. Specify type 'endpoint' or 'schema'. Returns a single markdown/plaintext document containing all tabs and key metadata.",
    parameters: z.object({
      id: z.string().describe("Resource ID"),
      type: z.enum(["endpoint", "schema"]).describe("Resource type"),
    }),
    outputSchema: z.object({
      id: z.string(),
      type: z.enum(["endpoint", "schema"]),
      name: z.string().optional(),
      content: z.string().describe("Concatenated documentation suitable for AI consumption"),
    }),
  })
  async aiView({ id, type }: { id: string; type: "endpoint" | "schema" }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return { id, type, content: "" };
    }

    if (type === "endpoint") {
      const entity = await lastValueFrom(
        this.httpService.get<RestDocumentation>(`${metadata.url}/api/data/get/endpoint/${id}`)
      ).then((a) => a.data);
      if (!entity) return { id, type, content: "" };

      const { tabs = [], name, data: rowData } = entity as any;
      const header = this.renderEndpointHeader(name, rowData);
      const tabsDoc = this.concatTabs(tabs);
      return { id, type, name, content: `${header}\n\n${tabsDoc}`.trim() };
    }

    // schema
    const entity = await lastValueFrom(
      this.httpService.get<SchemaDocumentation>(`${metadata.url}/api/data/get/schema/${id}`)
    ).then((a) => a.data);
    if (!entity) return { id, type, content: "" };

    const { tabs = [], name, data: rowData } = entity as any;
    const header = this.renderSchemaHeader(name, rowData);
    const tabsDoc = this.concatTabs(tabs);
    return { id, type, name, content: `${header}\n\n${tabsDoc}`.trim() };
  }

  private concatTabs(tabs: Array<{ name: string; content: string }>): string {
    if (!tabs || tabs.length === 0) return "";
    // Preserve original order; use kebab case in small headers for clarity
    return tabs
      .map((t) => {
        const title = t.name?.trim() || "Section";
        return `# ${title}\n\n${(t.content || "").trim()}`;
      })
      .join("\n\n---\n\n");
  }

  private renderEndpointHeader(name?: string, rowData?: any): string {
    if (!rowData) return name ? `Endpoint: ${name}` : "Endpoint";
    const lines: string[] = [];
    if (name) lines.push(`Endpoint: ${name}`);
    if (rowData.method || rowData.requestUrl) {
      lines.push(`Method/Path: ${rowData.method || ""} ${rowData.requestUrl || ""}`.trim());
    }
    if (rowData.operationId) lines.push(`Operation ID: ${rowData.operationId}`);
    if (rowData.description) lines.push(`Description: ${rowData.description}`);
    if (Array.isArray(rowData.paths) && rowData.paths.length) {
      lines.push(`Paths: ${rowData.paths.join(", ")}`);
    }
    if (Array.isArray(rowData.variables) && rowData.variables.length) {
      const v = rowData.variables.map((v: any) => `${v.name} in ${v.in}${v.ref ? ` (${v.ref})` : ""}`).join(", ");
      lines.push(`Variables: ${v}`);
    }
    return lines.join("\n");
  }

  private renderSchemaHeader(name?: string, rowData?: any): string {
    if (!rowData) return name ? `Schema: ${name}` : "Schema";
    const lines: string[] = [];
    if (name) lines.push(`Schema: ${name}`);
    if (rowData.type) lines.push(`Type: ${rowData.type}`);
    if (rowData.description) lines.push(`Description: ${rowData.description}`);
    return lines.join("\n");
  }
}
