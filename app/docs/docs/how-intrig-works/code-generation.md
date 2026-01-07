# Code Generation

Transforms normalized OpenAPI specifications into framework-specific TypeScript SDKs with complete type safety, runtime validation, and compile-time contract verification.

---

## Generation Process

Code generation reads normalized specifications from `.intrig/specs/{sourceId}-latest.json` and produces two categories of artifacts:

**Data Types** (framework-agnostic):
- TypeScript interfaces and type definitions
- Zod schemas for runtime validation
- JSON Schema representations for tooling integration

**Integration Code** (framework-specific):
- Generated hooks, functions, or modules based on target framework
- Request/response handling with NetworkState management
- Type-safe parameter passing and response parsing

The generated SDK is compiled and published to `node_modules/@intrig/{framework}` for immediate import.

:::note Prerequisite
Always run synchronization (`intrig sync`) before generation to ensure specifications are current.
:::

---

## Command

```bash
intrig generate
```

Generates SDKs for all configured sources. The command:

1. Reads normalized specifications from `.intrig/specs/`
2. Generates TypeScript code based on framework configuration
3. Compiles generated code with TypeScript compiler
4. Publishes compiled SDK to `node_modules`

**CI Mode**:

```bash
intrig generate --ci
```

Runs generation without daemon dependency, suitable for continuous integration pipelines.

---

## Generated Artifacts

### Type Definitions

TypeScript interfaces generated from OpenAPI schemas:

```typescript
// Generated from OpenAPI schema
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface GetUserParams {
  id: string;
}
```

### Runtime Validation

Zod schemas for request/response validation:

```typescript
// Generated Zod schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});
```

### Framework Integration

Framework-specific code structure depends on the configured generator. Import paths follow the pattern:

```typescript
@intrig/{framework}/{sourceId}/{...path-to-operation}
```

Refer to framework-specific documentation for detailed integration patterns.

---

## When to Run

Generation is required in these scenarios:

**Initial Setup**: After cloning repository or initial project configuration

**Post-Sync**: After running `intrig sync` to incorporate specification changes

**Dependency Installation**: After `npm install` or `yarn install` which clears `node_modules`

**Branch Changes**: After switching branches if specifications differ

**Build Process**: In CI/CD pipelines to ensure SDK availability for compilation

---

## Regeneration Behavior

### Overwrites

Each generation completely replaces the published SDK in `node_modules`. Any manual modifications to generated files will be lost.

:::warning Do Not Edit Generated Files
Generated code is ephemeral. Modifications will be lost on next generation. Extend or wrap generated code instead of modifying it directly.
:::

### Idempotency

Identical specifications produce identical generated code. Generation is deterministic and can be run multiple times without side effects.

---

## Common Issues

### Import Failures

**Symptom**: Import statements fail with module not found errors.

**Cause**: `operationId` changed in OpenAPI specification.

**Resolution**: Search for the endpoint by path or tag to find the new import path. Update import statements to match new operation identifier.

### Type Errors

**Symptom**: TypeScript compilation errors at call sites.

**Cause**: Schema changed in OpenAPI specification (parameter added/removed, type changed).

**Resolution**: Update code to match new type signatures. The TypeScript compiler will indicate exact locations requiring changes.

### Missing Specification

**Symptom**: Generation fails with specification not found error.

**Cause**: Specification has not been synchronized.

**Resolution**: Run `intrig sync --all` to fetch specifications before generation.

### Stale SDK

**Symptom**: Generated code does not reflect recent API changes.

**Cause**: Generation has not been run after specification sync.

**Resolution**: Run `intrig generate` after syncing specifications.

---

## Integration with Build Process

Include generation in `postinstall` script to ensure SDK availability after dependency installation:

```json
{
  "scripts": {
    "postinstall": "intrig generate"
  }
}
```

In CI environments, use explicit generation steps:

```bash
# CI pipeline
npm install
intrig sync --ci --all
intrig generate --ci
npm run build
```

---

## Related Documentation

- [Synchronization](./synchronization.md) - Fetching and normalizing specifications
- [Complete Workflow](./workflow.md) - End-to-end development process
- Framework-specific guides - Integration patterns per framework

## Framework-Specific Reference

The code generation output varies by plugin. Each framework has distinct patterns:

- **React**: Hooks returning `[state, execute, clear]` tuples
- **Next.js**: React hooks with SSR/RSC considerations

For complete API reference including configuration options, state management, and usage patterns:

- [React SDK Reference](/docs/react/)
- [Next.js SDK Reference](/docs/next/)
