# Thinking in Intrig

Frontend-backend integration in traditional development workflows introduces coordination overhead and integration failures that manifest as runtime errors or delayed compilation feedback. Manual type synchronization and parallel development tracks create opportunities for drift between API contracts and client implementations.

## Traditional Integration Model

Frontend and backend development typically proceed in parallel with integration occurring late in the development cycle. This pattern creates several technical challenges:

**Manual Type Maintenance**: Frontend developers manually define request and response types based on API documentation or verbal agreements, requiring continuous synchronization when contracts change.

**Parallel Development Assumptions**: Teams work simultaneously on frontend and backend under assumptions about API structure. Changes to these assumptions require rework and coordination.

**Late Integration Discovery**: Type mismatches and contract violations surface during integration testing or production rather than at compile time.

**Ad-hoc Synchronization**: Teams rely on communication channels (documentation, meetings, messages) to coordinate API changes rather than automated contract validation.

## API-First Development Model

Intrig establishes the OpenAPI specification as the authoritative contract between frontend and backend systems. This architectural approach shifts integration validation from runtime to compile time.

### Development Workflow

**Specification-First Design**: API contracts are defined in OpenAPI specifications before implementation begins. Changes to these specifications trigger deterministic updates across the system.

**Mock Implementation Pattern**: Backend teams can provide mock endpoint implementations that match the OpenAPI contract. These mocks enable frontend development to proceed while backend implementation continues, eliminating parallel development coordination overhead.

**Automated Contract Synchronization**: Running `intrig sync` fetches the latest OpenAPI specification. Running `intrig generate` produces updated type-safe code. Breaking changes in the API surface as TypeScript compilation errors.

**Compile-Time Validation**: Changes to endpoint signatures, request parameters, or response schemas trigger immediate TypeScript errors rather than runtime failures.

**Example workflow**:

1. Backend team updates OpenAPI specification
2. Frontend team runs `intrig sync --all && intrig generate`
3. TypeScript compiler validates all integration points
4. Breaking changes surface as compilation errors with precise locations

```typescript
// OpenAPI specification removes 'phoneNumber' field from User schema
const user = await getUser({ id: '123' });
console.log(user.phoneNumber);
// Compilation error: Property 'phoneNumber' does not exist on type 'User'
```

Contract violations are detected during the build phase rather than discovered in production.

## Synchronization and Type Safety

Traditional development discovers API changes through manual testing or production failures. Intrig provides instantaneous feedback through the compilation process.

**Synchronization Process**:

```bash
# Fetch latest API definitions
intrig sync --all

# Regenerate type-safe code
intrig generate
```

**Type-Checking Feedback**:

- Parameter signature changes trigger compilation errors at call sites
- Schema modifications update generated types, highlighting mismatches
- `operationId` changes modify hook names, causing import failures until updated

**Trade-off**: Generated hook names derive from OpenAPI `operationId` fields. Changes to these identifiers require updating import statements. Path changes remain transparent unless path parameters change, which alters function signatures and triggers type errors.

This approach shifts integration error detection from runtime to compile time, providing immediate feedback on contract violations.

## Resource Discovery and Integration

Generated SDKs provide discoverable interfaces through standard import mechanisms. Developers locate endpoints using:

- Operation identifiers from OpenAPI specifications
- Endpoint paths and HTTP methods
- Generated hook names and function signatures

```bash
# Search for endpoints by name or path
intrig search "getUser"

# View endpoint details
intrig view <endpoint-id> --type endpoint
```

The generated SDK provides immediate integration without manual type definition:

```typescript
// Generated hook with complete type information
import { useGetUser } from '@intrig/react/userApi/users/getUser/useGetUser';

const [userState, getUser] = useGetUser();
// Full type safety with no manual type definitions required
```

## Framework-Specific Patterns

Intrig generates framework-specific code that follows established patterns for state management, lifecycle handling, and data fetching. React generators produce hooks with NetworkState management. Next.js generators include server-side function integration and middleware support.

Framework-specific documentation provides detailed implementation patterns for each target environment.

## Architectural Implications

**Deterministic Generation**: Identical OpenAPI specifications produce identical generated code. No manual intervention or configuration affects output consistency.

**Build-Time Validation**: API contract changes prevent successful compilation when breaking changes occur. This property eliminates a class of integration failures that traditional approaches detect at runtime.

**Contract Traceability**: Generated code maintains direct mapping to OpenAPI operations. Each generated hook or function corresponds to a specific endpoint definition.

**Separation of Concerns**: Generated code compiles to `node_modules`, maintaining clear boundaries between application code and generated integration layer.

## Key Properties

**Compile-time contract validation**: Breaking changes in API contracts prevent successful builds, shifting error detection left in the development cycle.

**Specification-driven development**: OpenAPI specifications function as executable contracts rather than documentation artifacts.

**Automated synchronization**: Manual coordination is replaced with deterministic code generation from authoritative specifications.

**Type safety without overhead**: Complete TypeScript integration without manual type maintenance or defensive runtime checks.

[Implementation guide: Getting Started →](./getting-started.md)
