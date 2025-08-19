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
import {AiResource} from "./ai.resource";

const instructions = `
Intrig is a code generation tool that consumes OpenAPI (Swagger) documentation and generates typed data models and React hooks for frontend developers.

Use this MCP server to discover available endpoints and data types, and to view unified documentation for each resource.

Two AI-friendly tools are exposed:

1. ai-search: Unified search across endpoints (type: "endpoint") and data types (type: "schema").
2. ai-view: Concatenated documentation for a specific resource id and type.

Notes:
- Prefer ai-search first, then ai-view with the selected id and type.
- Hooks typically follow the import path '@intrig/react/<source>/<tag>/<operation>/client'.
- Use utility methods like 'isSuccess', 'isPending', and 'isError' from '@intrig/react' to handle hook responses.

This MCP server only provides documentation and structure. It does not execute hooks or mutate data.
`;


@Module({
  imports: [
    Mcp.forRoot({
      name: 'intrig-daemon',
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
    AiResource
  ]
})
export class McpModule {}
