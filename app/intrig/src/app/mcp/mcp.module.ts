import { Module } from '@nestjs/common';
import {McpModule as Mcp, McpTransportType} from "@rekog/mcp-nest";
import {PrebuildCommand} from "../cli/commands/prebuild.command";
import {PostbuildCommand} from "../cli/commands/postbuild.command";
import {ProcessManagerService} from "../cli/process-manager.service";
import {DiscoveryModule} from "../discovery/discovery.module";
import {CommonModule} from "common";
import {NextCliModule, NextCliService} from "next-binding";
import {ReactCliModule, ReactCliService} from "react-binding";
import {GENERATORS} from "../cli/tokens";
import {GenerateCommand} from "../cli/commands/generate.command";
import {ConfigModule} from "@nestjs/config";
import {HttpModule} from "@nestjs/axios";
import {EndpointsResource} from "./endpoints.resource";
import {SchemaResource} from "./schema.resource";

const instructions = `
Intrig is a code generation tool that consumes OpenAPI (Swagger) documentation and generates typed data models and React hooks for frontend developers.

Use this MCP server to discover available endpoints, data types, and usage patterns for the generated hooks. The server provides both structured metadata and markdown documentation.

There are two main usage patterns for hooks:

1. Stateful hooks: These manage persistent or shared state (e.g., user info, cart). They return a tuple like [state, fetchFn, clearFn], support caching, and follow the React useState pattern.

2. Stateless hooks: These are for one-off operations like validation. They return a tuple like [asyncFn, abortFn], bypass caching, and are often suffixed with 'Async'.

Usage Instructions:
- Use the 'catalog-endpoints' or 'search-endpoints' tools to discover available endpoints.
- Use the 'endpoint-usage' tool to understand how to use a hook properly.
- Use 'catalog-schemas' or 'search-data-types' tools to discover available data types.
- Use 'schema-representations' tool to retrieve markdown representations and examples of data types.
- Always consult 'endpoint-usage' before generating or suggesting code—do not guess usage patterns.
- Use utility methods like 'isSuccess', 'isPending', and 'isError' from '@intrig/react' to handle hook responses.
- To manage multiple hook instances, use the 'key' property to differentiate them.
- Hooks follow a structured import path: '@intrig/react/<source>/<tag>/<operation>/client'.

Note: This MCP server only provides documentation and structure. It does not execute hooks or mutate data.
`;


@Module({
  imports: [
    Mcp.forRoot({
      name: 'intrig-deamon',
      version: '0.0.1',
      transport: McpTransportType.STDIO,
      instructions
    }),
    DiscoveryModule,
    CommonModule,
    HttpModule,
    NextCliModule,
    ReactCliModule,
    ConfigModule,
  ],
  providers: [
    PrebuildCommand,
    PostbuildCommand,
    ProcessManagerService,
    GenerateCommand,
    {
      provide: GENERATORS,
      inject: [NextCliService, ReactCliService],
      useFactory(nextCliService: NextCliService, reactCliService: ReactCliService) {
        return [nextCliService, reactCliService]
      }
    },
    EndpointsResource,
    SchemaResource
  ]
})
export class McpModule {}
