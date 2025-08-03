import { Injectable } from "@nestjs/common";
import {ResourceTemplate, Tool} from "@rekog/mcp-nest";
import * as z from 'zod';
import {ProcessManagerService} from "../cli/process-manager.service";
import {HttpService} from "@nestjs/axios";
import {lastValueFrom} from "rxjs";
import {kebabCase, Page, ResourceDescriptor, SchemaDocumentation} from "common";

@Injectable()
export class SchemaResource {
  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
  }

  @Tool({
    name: 'catalog-schemas',
    description: 'List all schemas with name and available representations',
    parameters: z.object({}),
    outputSchema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      representations: z.array(z.string()),
    })),
  })
  async catalogSchemas() {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        contents: []
      }
    }
    const response = await lastValueFrom(
      this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
        params: { query: "", page: 1, size: 10000, type: 'schema' },
      }),
    ).then(a => a.data);

    return response.data.map(a => ({
      id: a.id,
      name: a.name,
      representations: a.data?.tabs?.map((b: any) => kebabCase(b.name)) || []
    }))
  }

  @Tool({
    name: 'search-data-types',
    description: 'Search for data types',
    annotations: {
      title: 'Search for data types',
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
          name: z.string(),
          schema: z.any().describe("This field is a JSON-Schema (OpenAPI v3) object")
        })
      }))
    })
  })
  async searchSchemas({query, page, size}: {query: string, page: number, size: number}) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        contents: []
      }
    }
    const response = await lastValueFrom(
      this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
        params: { query, page, size, type: 'schema' },
      }),
    ).then(a => a.data);

    return response
  }

  @Tool({
    name: 'schema-info',
    description: 'Provides schema information',
    parameters: z.object({
      id: z.string().describe('The schema ID')
    }),
    outputSchema: z.object({
      id: z.string(),
      name: z.string(),
      representations: z.array(z.string()),
      // Include other potential fields from rowData
      description: z.string().optional(),
      type: z.string().optional(),
      schema: z.any().optional().describe("JSON-Schema (OpenAPI v3) object")
    })
  })
  async getSchemaById({ id }: { id: string }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {}
    }

    const entity = await lastValueFrom(
      this.httpService.get<SchemaDocumentation>(`${metadata.url}/api/data/get/schema/${id}`),
    ).then(a => a.data);
    if (!entity) {
      return {}
    }
    const {tabs, ...rowData} = entity;
    
    return {
      ...rowData,
      id,
      representations: tabs.map(a => kebabCase(a.name))
    }
  }

  @Tool({
    name: 'schema-representations',
    description: 'Provides schema representation info',
    parameters: z.object({
      id: z.string().describe('The schema ID'),
      representations: z.string().describe('The representation name')
    }),
    outputSchema: z.object({
      content: z.string().describe('The markdown content for the representation')
    })
  })
  async getSchemaRepresentation({ id, representations }: { id: string, representations: string }) {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      return {
        content: ''
      }
    }

    const entity = await lastValueFrom(
      this.httpService.get<SchemaDocumentation>(`${metadata.url}/api/data/get/schema/${id}`),
    ).then(a => a.data);
    if (!entity) {
      return {
        content: ''
      }
    }

    const usecaseDoc = entity.tabs.find(a => kebabCase(a.name) === representations);
    if (!usecaseDoc) {
      return {
        content: ''
      }
    }

    return {
      content: usecaseDoc.content
    }
  }
}