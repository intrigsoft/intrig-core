---
# This file is the introduction to the Intrig documentation
# It is intentionally concise and linked from the root of the sidebar
---

# Intrig Documentation

Intrig is a TypeScript SDK generator that creates type-safe, framework-specific client code from OpenAPI/Swagger specifications. Generated SDKs compile to `node_modules`, providing immediate integration with existing TypeScript projects while maintaining complete type safety and compile-time validation of API contracts.

## Core Capabilities

**SDK Generation**: Compiles generated code to `node_modules`, maintaining clean project separation and standard import patterns.

**Insight Tool**: Daemon-powered searchable API documentation with generated code examples for rapid endpoint discovery and implementation.

**Synchronization**: Automated API contract synchronization with compile-time validation. Breaking changes surface as TypeScript compilation errors rather than runtime failures.

**Type Safety**: Full TypeScript integration with breaking change detection at build time. API schema changes trigger immediate type-checking feedback.

## Standard Workflow

1. Install Intrig and initialize configuration
2. Add API sources from OpenAPI specifications
3. Synchronize API definitions and generate SDK
4. Import and use generated hooks in application code

```bash
# Sync and generate
intrig sync --all && intrig generate
```

## Resource Discovery

Navigate the generated SDK using CLI tools:

```bash
# Search for endpoints or schemas
intrig search "query" --no-interactive

# Inspect resource details
intrig view <id> --no-interactive --type "schema|endpoint"
```

**Next steps**: [Getting Started Guide](./getting-started.md)