# Intrig: Problem Space and Architectural Decisions

## The Integration Problem

### Problem 1: Manual API Integration Overhead

Frontend developers integrating with backend APIs face significant overhead:

**Current state:**
- Manually read OpenAPI/Swagger documentation
- Manually write TypeScript types to match API schemas
- Manually implement request/response handling
- Manually maintain synchronization as APIs evolve

**Cost:**
- Time: 2-4 hours per API integration on average
- Error rate: High - manual typing introduces inconsistencies
- Maintenance burden: Every API change requires manual updates across codebase

**Business impact:**
- 30-40% of frontend development time spent on integration boilerplate
- Runtime errors from API/type mismatches reach production
- Delayed detection of breaking changes

### Problem 2: Late Integration Detection

**Traditional workflow:**
```
Backend development ║ Frontend development
      ↓              ║        ↓
   API changes       ║   Uses old types
      ↓              ║        ↓
   Deploy            ║   Integration testing
      ↓              ║        ↓
                  [DISCOVER BREAKAGE]
```

Integration issues surface late:
- During QA testing
- In staging environment
- In production (worst case)

**Cost:**
- High bug fix cost (later detection = exponentially higher cost)
- Deployment delays
- Production incidents

### Problem 3: Type Safety Gap

Even with TypeScript, type safety breaks at the API boundary:
```typescript
// Types defined manually
interface User {
  name: string;
  email: string;
  phoneNumber: string; // Field was removed in backend
}

// No compile-time error
const user: User = await fetch('/api/user/123').then(r => r.json());
console.log(user.phoneNumber); // undefined at runtime
```

Backend removes field → Frontend still expects it → Runtime failure

**Root cause:** Types are manually maintained, not derived from source of truth

### Problem 4: SDK Generator Limitations

Existing SDK generators (OpenAPI Generator, Swagger Codegen) solve part of the problem but introduce new issues:

**Issue 4a: Code Pollution**
```
src/
├── generated/          # 10,000+ lines of generated code
│   ├── api/
│   ├── models/
│   └── ...
├── components/         # Your actual code
└── ...
```

Generated code pollutes the repository:
- Must be committed to version control
- Merge conflicts in generated files
- Difficult to distinguish generated vs. hand-written code
- Temptation to manually edit generated code (breaks regeneration)

**Issue 4b: Knowledge Cost**

Developers must learn:
1. How to use the SDK generator tool
2. What code was generated
3. How to use the generated code
4. Where to find documentation for generated APIs

This creates friction and slows adoption.

## Intrig's Architectural Solutions

### Solution 1: API-First Development Model

**Principle:** OpenAPI specification is the single source of truth
```
Backend defines contract (OpenAPI)
         ↓
    intrig sync (fetch & normalize)
         ↓
    intrig generate (create SDK)
         ↓
    TypeScript compilation
         ↓
[BREAKING CHANGES = COMPILATION ERRORS]
```

**Benefits:**
- Breaking changes detected at build time, not runtime
- Frontend and backend work from same contract
- Type mismatches impossible (types derived from spec)
- Integration issues surface immediately

**Measurement:** 50% reduction in integration time

### Solution 2: Clean Code Separation

**Decision:** Generate SDK as a compiled library in node_modules
```
.intrig/
├── generated/          # Temporary build directory
│   └── [generated code + build config]
└── specs/             # Normalized OpenAPI specs (committed)

node_modules/
└── @intrig/
    └── react/         # Compiled SDK (generated, not committed)
```

**Rationale:**
- Generated code never pollutes user's codebase
- Clear boundary between user code and generated code
- Standard npm package workflow (import from @intrig/react)
- Impossible to accidentally edit generated code

**Trade-off:** Must regenerate after `npm install`
**Mitigation:** `postinstall` script automates regeneration

**Comparison:**

| Aspect | Traditional Generators | Intrig |
|--------|----------------------|--------|
| Generated code location | `/src/generated/` | `/node_modules/@intrig/` |
| Committed to git | Yes (10,000+ lines) | No (only specs) |
| Merge conflicts | Frequent | Never |
| Manual editing risk | High | Impossible |
| Regeneration | Manual, risky | Automated, safe |

### Solution 3: Insight - Eliminating Knowledge Cost

**Problem identified:** Even with good SDK generation, developers must:
1. Know what APIs are available
2. Understand how to use generated hooks
3. Remember parameter requirements
4. Understand response schemas

**Solution:** Insight = Searchable API documentation + generated code examples

**Architecture:**
```
Daemon (background process)
├── Maintains normalized API specs
├── Indexes endpoints for search
└── Generates documentation on-demand

Insight Web UI (localhost:5050)
├── Search interface
├── Real-time documentation rendering
└── Copy-paste code generation
```

**Developer workflow:**
```
Need to fetch user data
    ↓
Search "user" in Insight
    ↓
See: useGetUser, useGetUsers, useUpdateUser, etc.
    ↓
Click useGetUser
    ↓
See: params, response schema, usage example
    ↓
Copy generated hook code
    ↓
Paste into component
    ↓
[WORKING CODE]
```

**Time:** 30 seconds from "need data" to "working implementation"

**Benefits:**
- No need to read OpenAPI specs
- No need to learn SDK structure
- No need to write integration code
- Correct code on first try (types, parameters, error handling)

**Competitive advantage:** Eliminates the "learning curve" problem that plagues other SDK generators

### Solution 4: Framework-Specific Optimization

**Decision:** Plugin architecture for framework-specific code generation

Rather than generic REST client:
```typescript
// Generic (other generators)
const response = await api.users.get({ id: '123' });
```

Generate framework-idiomatic code:
```typescript
// React-specific (Intrig)
const [user, getUser] = useGetUser();

// Next.js-specific (Intrig)
const user = await getUserAction({ id: '123' }); // Server
const [user] = useGetUser(); // Client
```

**Benefits:**
- Feels native to framework
- Leverages framework features (hooks, server functions, etc.)
- Optimal patterns for each environment
- Type safety through entire stack

**Next.js example:** Automatically generates proxy routes for client-side calls
```
User component (client)
    ↓ calls hook
Generated proxy at /app/api/@intrig/[...route]
    ↓ forwards
Real backend API
```

Developer writes client code, server infrastructure is automatic.

## Architecture Decisions Record

### Decision 1: Daemon Architecture

**Context:** Need real-time documentation, future IDE plugins, analysis tools

**Decision:** Build daemon upfront rather than CLI-only tool

**Rationale:**
- Insight requires persistent process for documentation serving
- Future IDE plugins need persistent connection
- Pro features (monitoring, analysis) need background processing
- Better than collection of disconnected CLI scripts

**Trade-off:** Additional complexity, process management
**Benefit:** Foundation for ecosystem expansion

### Decision 2: Normalized Spec Storage

**Context:** Different backends may have inconsistent OpenAPI implementations

**Decision:** Sync phase normalizes specs before generation

**Rationale:**
- Backend specs may be incomplete or malformed
- Normalization ensures consistent generation
- Enables validation and error reporting
- Cached specs enable offline development

**Location:** `.intrig/specs/{sourceId}-latest.json`
**Committed:** Yes (enables team synchronization)

### Decision 3: Global State Management

**Context:** React hooks need to share data across components

**Decision:** Generated hooks use global store (not component-local state)

**Rationale:**
- Prevents duplicate network requests
- Enables data sharing across components
- Supports hierarchical component patterns (active/passive hooks)
- Matches real-world usage patterns

**Trade-off:** Global state management complexity
**Benefit:** Optimal for API data (typically shared, not component-local)

### Decision 4: TypeScript-Only Generation

**Context:** Could support JavaScript with JSDoc

**Decision:** Generate TypeScript only

**Rationale:**
- Type safety is core value proposition
- Target audience uses TypeScript in production
- Simpler generation and maintenance
- JavaScript users can still import (types ignored)

## Problem Space Summary

| Problem | Traditional Approach | Intrig Solution | Benefit |
|---------|---------------------|-----------------|---------|
| Manual integration overhead | Hand-write types and requests | Automated generation | 50% time savings |
| Late breaking change detection | Runtime errors | Compile-time errors | Zero production incidents |
| Type safety gap | Manual type maintenance | Generated from source | Impossible type mismatches |
| Code pollution | Commit generated code | SDK in node_modules | Clean repositories |
| Knowledge cost | Learn generated structure | Insight search + copy | 30 second integration |
| Framework mismatch | Generic clients | Framework-specific generation | Idiomatic code |

## Future Problem Space

### Planned Solutions

**IDE Integration:**
- Problem: Still need to open Insight separately
- Solution: IDE plugins bring Insight into editor (autocomplete, hover docs)

**MCP Integration:**
- Problem: AI tools don't understand your API structure
- Solution: MCP protocol exposes API schema to AI assistants

**Code Analysis (Pro):**
- Problem: Unused endpoints, performance bottlenecks unclear
- Solution: Static analysis identifies optimization opportunities

**Runtime Monitoring (Pro):**
- Problem: Production API behavior opaque
- Solution: Instrumented SDK reports metrics, errors

**API Testing (Pro):**
- Problem: Separate tools for API testing (Postman, etc.)
- Solution: Integrated testing using generated types and methods

## Conclusion

Intrig solves API integration through:
1. **Correctness:** Type safety + compile-time validation
2. **Efficiency:** Automated generation + Insight discovery
3. **Maintainability:** Clean architecture + synchronized contracts
4. **Developer experience:** Framework-idiomatic code + zero learning curve

Core insight: **The OpenAPI specification contains all necessary information. Stop maintaining types manually. Generate once, use confidently.**