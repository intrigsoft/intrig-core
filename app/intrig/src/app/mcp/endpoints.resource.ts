import {Injectable, Scope} from "@nestjs/common";
import {ResourceTemplate, Tool} from "@rekog/mcp-nest";
import {ReadResourceResult} from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod';
import {kebabCase, Page, ResourceDescriptor, RestDocumentation} from 'common'
import {HttpService} from "@nestjs/axios";
import {lastValueFrom} from "rxjs";
import {ProcessManagerService} from "../cli/process-manager.service";

@Injectable({ scope: Scope.REQUEST })
export class EndpointsResource {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
  }

  @Tool({
    name: 'catalog-endpoints',
    description: 'List all endpoints with their readable name and available use cases',
    parameters: z.object({}),
    outputSchema: z.object({
      catalog: z.array(z.object({
        id: z.string(),
        name: z.string(),
        useCases: z.array(z.string()),
      })),
      error: z.string().optional(),
    }),
  })
  async catalogEndpoints() {
    try {
      const metadata = await this.pm.getMetadata();
      if (!metadata) {
        return {}
      }
      const response = await lastValueFrom(
        this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
          params: {query: "", page: 1, size: 10000, type: 'rest'},
        }),
      ).then(a => a.data);

      return {
        catalog: response.data.map(a => ({
          id: a.id,
          name: a.name,
          useCases: a.data?.tabs?.map((b: any) => kebabCase(b.name)) || []
        }))
      }
    } catch (e) {
      return {
        catalog: [],
        error: JSON.stringify(e),
      }
    }
  }

  @Tool({
    name: 'search-endpoints',
    description: 'Search for endpoints',
    annotations: {
      title: 'Search for endpoints',
      readOnlyHint: true
    },
    parameters: z.object({
      query: z.string(),
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
      data: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        source: z.string(),
        path: z.string(),
        data: z.object({
          paths: z.array(z.string()),
          variables: z.array(z.object({
            name: z.string(),
            in: z.string(),
            ref: z.string(),
          })),
          requestUrl: z.string(),
          operationId: z.string(),
          method: z.string(),
          description: z.string(),
          summary: z.string(),
          response: z.string().optional(),
          responseType: z.string().optional(),
          errorResponses: z.record(z.object({
            response: z.string(),
            responseType: z.string(),
          })).optional(),
          responseExamples: z.record(z.unknown()).optional(),
          // optional for methods that include a request body
          contentType: z.string().optional(),
          requestBody: z.string().optional(),
        }),
      }))
    })
  })
  async searchEndpoints({ query, page, size }: { query: string, page: number, size: number }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {

      }
    }
    const response = await lastValueFrom(
      this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
        params: { query, page, size, type: 'rest' },
      }),
    ).then(a => a.data);

    return response
  }

  @Tool({
    name: 'endpoint-info',
    description: 'Provides endpoint information',
    parameters: z.object({
      id: z.string().describe('The endpoint ID')
    }),
    outputSchema: z.object({
      id: z.string(),
      name: z.string(),
      useCases: z.array(z.string()),
      // Include other fields from rowData
      paths: z.array(z.string()).optional(),
      variables: z.array(z.object({
        name: z.string(),
        in: z.string(),
        ref: z.string(),
      })).optional(),
      requestUrl: z.string().optional(),
      operationId: z.string().optional(),
      method: z.string().optional(),
      description: z.string().optional(),
      summary: z.string().optional(),
    })
  })
  async getEndpointInfo({ id }: { id: string }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {}
    }

    const entity = await lastValueFrom(
      this.httpService.get<RestDocumentation>(`${metadata.url}/api/data/get/endpoint/${id}`),
    ).then(a => a.data)
    if (!entity) {
      return {}
    }
    const {tabs, ...rowData} = entity;
    
    return {
      ...rowData,
      id,
      useCases: tabs.map(a => kebabCase(a.name))
    }
  }

  @Tool({
    name: 'endpoint-usage',
    description: 'Provides endpoint usage',
    parameters: z.object({
      id: z.string().describe('The endpoint ID'),
      useCase: z.string().describe('The use case name')
    }),
    outputSchema: z.object({
      content: z.string().describe('The markdown content for the use case')
    })
  })
  async getEndpointSchema({ id, useCase }: { id: string, useCase: string }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        content: ''
      }
    }

    const entity = await lastValueFrom(
      this.httpService.get<RestDocumentation>(`${metadata.url}/api/data/get/endpoint/${id}`),
    ).then(a => a.data)

    if (!entity) {
      return {
        content: ''
      }
    }

    const usecaseDoc = entity.tabs.find(a => kebabCase(a.name) === useCase);

    if (!usecaseDoc) {
      return {
        content: ''
      }
    }

    return {
      content: usecaseDoc.content
    }
  }

  @Tool({
    name: 'get-hook-usage',
    description: 'Get hook usage',
    inputSchema: z.object({
      hookId: z.string(),
      useCase: z.enum(['stateful-hook', 'stateless-hook', 'sse-hook']),
    }),
    outputSchema: z.object({
      hookId: z.string(),
      hookName: z.string(),
      usageType: z.enum(['stateful-hook', 'stateless-hook', 'sse-hook']),
      importPath: z.string(),
      usageMarkdown: z.string(),
      notes: z.array(z.string()).optional(),
    })
  })
  async getHookUsage({ hookId, useCase }: { hookId: string, useCase: string }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        contents: []
      }
    }

    const entity = await lastValueFrom(
      this.httpService.get<RestDocumentation>(`${metadata.url}/api/data/get/endpoint/${id}`),
    ).then(a => a.data)

    if (!entity) {
      return {
        contents: []
      }
    }

    const usecaseDoc = entity.tabs.find(a => kebabCase(a.name) === useCase);

    if (!usecaseDoc) {
      return {
        contents: []
      }
    }

    const markdown = usecaseDoc.content;

    // Extract hook name and import path using regex
    const importMatch = markdown.match(/import\s+\{\s*(use\w+)\s*\}\s+from\s+["']([^"']+)["']/);
    const hookName = importMatch?.[1] ?? `use${hookId}`;
    const importPath = importMatch?.[2] ?? `@intrig/react/.../${hookId}/client`;

    return {
      hookId,
      hookName,
      usageType: useCase,
      importPath,
      usageMarkdown: markdown,
      notes: [
        'Always read usageMarkdown before suggesting hook usage.',
        'Use "isSuccess", "isPending", and "isError" for handling stateful hooks.',
        'Use "fetchOnMount", "clearOnUnmount", and "key" for lifecycle-bound operations if applicable.'
      ]
    };
  }
}