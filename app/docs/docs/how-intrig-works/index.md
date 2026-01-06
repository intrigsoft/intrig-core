# How Intrig Works

Intrig transforms OpenAPI specifications into type-safe, framework-specific SDKs through a deterministic generation pipeline. This section documents the core workflow components and their integration in the development process.

## Workflow Components

### [Initialization](./initialization.md)

Project setup and configuration initialization. Creates base configuration files, configures package integration, and prepares the project structure for SDK generation.

### [Source Management](./source-management.md)

API source configuration and management. Defines OpenAPI specification locations and manages the registry of backend services that will generate SDK code.

### [Synchronization](./synchronization.md)

OpenAPI specification fetching and normalization. Retrieves current API contracts from configured sources and prepares them for code generation. Breaking changes in specifications are detected during subsequent compilation.

### [Code Generation](./code-generation.md)

SDK generation and compilation to `node_modules`. Transforms normalized OpenAPI specifications into framework-specific TypeScript code with complete type safety and runtime validation schemas.

### [Daemon and Insight](./daemon-insight.md)

Background service management and API documentation interface. The daemon enables the Insight tool, providing searchable documentation for generated code and endpoint discovery during development.

### [MCP Integration](./mcp-integration.md)

Model Context Protocol server for AI-assisted development. Enables Claude Desktop and MCP-compatible IDEs to query API documentation, search endpoints, and retrieve type information directly within the development conversation.

### [Complete Development Workflow](./workflow.md)

End-to-end integration workflow from backend API changes through SDK regeneration, type checking, and implementation. Documents the feedback loop between specification changes and compile-time validation.

---

## Architecture Overview

Intrig operates through a deterministic pipeline:

```
OpenAPI Spec → Sync → Normalize → Generate → Compile → Publish to node_modules
```

Each step is idempotent. Identical specifications produce identical generated code. The SDK compiles to `node_modules/@intrig/{framework}`, enabling standard import patterns without project configuration changes.

## Key Properties

**Deterministic Generation**: Identical OpenAPI specifications always produce identical SDK artifacts.

**Compile-Time Validation**: API contract changes trigger TypeScript compilation errors before runtime.

**Framework Isolation**: Generated code is framework-specific but data types remain framework-agnostic.

**Standard Integration**: Published SDKs integrate as standard npm packages with no build tool configuration required.
