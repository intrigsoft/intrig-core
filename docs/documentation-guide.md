# Intrig Documentation Style Guide

## Project Context

**Intrig** is a TypeScript SDK generator that creates type-safe, framework-specific client code from OpenAPI/Swagger specifications.

### Core Capabilities
1. **SDK Generation**: Compiles generated code to `node_modules`, maintaining clean project separation
2. **Insight Tool**: Daemon-powered searchable API documentation with generated code examples
3. **Synchronization**: Automated API contract synchronization with compile-time validation
4. **Type Safety**: Full TypeScript integration with breaking change detection at build time

### Target Audience
**Professional software engineers** who:
- Have formal education and domain knowledge in UI development
- Work with TypeScript, React, and/or Next.js in production environments
- Make architectural decisions for teams
- Evaluate tools based on technical merit and production viability
- Require precise, complete documentation

---

## Multi-Style Documentation Approach

Different documentation sections serve distinct purposes and require appropriately matched styles:

### 1. Introduction & Core Concepts - Technical Context

**Purpose**: Establish the technical problem space and architectural approach

**Style Characteristics**:
- Clear problem statement with technical specificity
- Architectural explanation without marketing language
- Direct comparison to alternative approaches
- Minimal code (focus on concepts and system design)
- Technical accuracy over persuasion

**Code Density**: Low (10-20% of content)

**Template**:
```markdown
# [Concept Name]

[Technical problem statement - 2-3 sentences defining the issue]

## Traditional Approach

[Current state-of-practice and its limitations]

## Architectural Differences

[How this approach differs, with technical rationale]

[System behavior and guarantees]

**Illustrative example**:
```[minimal code showing the concept]
```

[Technical implications and system properties]

## Key Properties

[Core characteristics that define the system behavior]

[Link to implementation guide →]
```

**Example**:
```markdown
# API-First Development Model

Backend API changes introduce integration failures that manifest either as runtime errors in production or as delayed compilation errors during unrelated development work. Traditional integration patterns place the burden of synchronization on frontend developers through manual type maintenance and defensive coding practices.

## Traditional Integration Model

Frontend and backend development proceed in parallel with integration occurring late in the development cycle. Type definitions are manually maintained, requiring:

- Manual synchronization when API contracts change
- Defensive runtime checks for schema validation
- Discovery of breaking changes through testing or production failures
- Manual coordination between frontend and backend teams

## Architectural Model

Intrig establishes the OpenAPI specification as the authoritative contract. Changes to this specification trigger a deterministic build process:

1. Specification changes are synchronized to local storage
2. SDK regeneration produces updated type definitions
3. TypeScript compilation validates all integration points
4. Breaking changes surface as compilation errors

This approach shifts error detection from runtime to compile time, eliminating an entire class of integration failures.

**Example**:
```typescript
// Backend removes 'phoneNumber' field from User schema
const user = await getUser({ id: '123' });
console.log(user.phoneNumber); 
// Compilation error: Property 'phoneNumber' does not exist on type 'User'
```

Changes to the API contract are validated during the build phase rather than discovered in production.

## System Properties

- **Compile-time validation**: Breaking changes prevent successful builds
- **Deterministic generation**: Identical specifications produce identical SDKs
- **Type safety**: Full TypeScript integration across all generated code
- **Bidirectional traceability**: Generated code maps directly to OpenAPI operations

[Implementation guide: Getting Started →]
```

---

### 2. API Reference - Technical Specification

**Purpose**: Provide complete technical specification for implementation

**Style Characteristics**:
- Comprehensive parameter documentation
- Type signatures with full generic parameters
- Behavior specification for all code paths
- Edge case documentation
- Performance characteristics where relevant
- Assumes technical competence

**Code Density**: High (60-70% of content)

**Template**:
```markdown
# [Function/Hook Name]

[Single sentence technical description]

```typescript
// Complete type signature
function hookName(params): ReturnType
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| ... | ... | ... | ... | ... |

## Return Value

[Precise description of return type and structure]

## Behavior

[Specification of function behavior, state transitions, side effects]

## Examples

### Basic Implementation
```typescript
[Minimal viable example]
```

### With Configuration
```typescript
[Common configuration patterns]
```

### Advanced Usage
```typescript
[Complex use cases]
```

## Technical Notes

- Concurrency behavior
- State management implications
- Performance considerations
- Edge cases and error conditions

## Type Definitions

<details>
<summary>Complete type definitions</summary>

```typescript
[Full TypeScript interfaces and types]
```
</details>

## Related References

- [Related function]
- [Relevant concept]
```

**Example**:
```markdown
# useGetUser

Retrieves a single user resource with automatic state management and request deduplication.

```typescript
function useGetUser(
  options?: UnaryHookOptions<GetUserParams>
): [
  NetworkState<User>,
  (params: GetUserParams) => void,
  () => void
]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| options | `UnaryHookOptions<GetUserParams>` | No | `{}` | Configuration object |
| options.key | `string` | No | `'default'` | State isolation key for managing multiple independent instances |
| options.fetchOnMount | `boolean` | No | `false` | Triggers automatic request on component mount |
| options.clearOnUnmount | `boolean` | No | `false` | Resets state to initial on component unmount |
| options.params | `GetUserParams` | Conditional | - | Required when `fetchOnMount` is `true` |

## Return Value

Returns a tuple of `[state, fetch, clear]`:

1. **state**: `NetworkState<User>` - Current request state following the NetworkState state machine
2. **fetch**: `(params: GetUserParams) => void` - Function to initiate request with given parameters
3. **clear**: `() => void` - Resets state to initial condition

## Behavior

The hook manages state through a global store keyed by the combination of endpoint identifier and `key` option. Multiple hook instances with identical keys share state and observe the same request lifecycle.

Request execution:
- Calling `fetch()` initiates a new request
- Any in-flight request with the same key is cancelled
- State transitions follow the NetworkState state machine: init → pending → (success | error)
- Successful responses are cached until explicitly cleared or component unmounts (if `clearOnUnmount` is true)

## Examples

### Basic Implementation
```typescript
const [user, getUser] = useGetUser();

// Manual request initiation
getUser({ id: '123' });
```

### Automatic Data Loading
```typescript
const [user] = useGetUser({
  fetchOnMount: true,
  params: { id: userId }
});

if (isSuccess(user)) {
  return <UserProfile data={user.data} />;
}
```

### State Isolation
```typescript
// Independent state management for concurrent requests
const [user1] = useGetUser({ key: 'user-1', params: { id: '1' } });
const [user2] = useGetUser({ key: 'user-2', params: { id: '2' } });
```

### Lifecycle Management
```typescript
const [user, getUser, clearUser] = useGetUser({
  fetchOnMount: true,
  clearOnUnmount: true,
  params: { id: userId }
});

// State automatically resets on component unmount
```

## Technical Notes

- **Request cancellation**: Subsequent `fetch()` calls cancel pending requests for the same key
- **State sharing**: Multiple components using identical keys access shared state without duplicate network requests
- **Memory management**: State persists in global store until explicitly cleared or component with `clearOnUnmount` unmounts
- **Lifecycle timing**: `clearOnUnmount` executes during component cleanup phase

## Type Definitions

<details>
<summary>Complete type definitions</summary>

```typescript
interface UnaryHookOptions<P> {
  key?: string;
  fetchOnMount?: boolean;
  clearOnUnmount?: boolean;
  params?: P;
}

type GetUserParams = {
  id: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  // Additional fields from OpenAPI schema
};

type NetworkState<T> = 
  | { status: 'init' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```
</details>

## Related References

- [NetworkState Specification](./network-state.md)
- [Stateless Hooks](./stateless-hooks.md)
- [State Management Architecture](../guides/state-management.md)
```

---

### 3. Tutorials & Implementation Guides - Structured Learning

**Purpose**: Provide step-by-step implementation guidance for complete features

**Style Characteristics**:
- Structured progression with clear objectives
- Technical explanation at each step
- Production-ready code patterns
- Explicit verification points
- Rationale for technical decisions
- Professional but instructional

**Code Density**: High (50-60% of content)

**Template**:
```markdown
# Implementation Guide: [Feature Name]

[Brief description of what will be implemented]

**Implementation scope:**
- Component 1
- Component 2
- Component 3

**Technical concepts covered:**
- Concept 1
- Concept 2
- Concept 3

**Prerequisites:**
- Requirement 1
- Requirement 2

**Estimated time**: X minutes

---

## Step 1: [Technical Task]

[Context and rationale for this step]

```bash
[Commands or setup]
```

[Technical explanation of what occurs]

**Verification**: [How to confirm successful completion]

## Step 2: [Next Technical Task]

[Context and connection to previous step]

```typescript
[Implementation code]
```

**Technical rationale**: [Why this approach]

**Verification**: [Expected state or output]

## Step 3: [Progressive Implementation]

[How this builds on previous steps]

```typescript
[Additional implementation]
```

[Explanation of technical decisions]

**Verification**: [Confirmation method]

[Continue with additional steps...]

## Implementation Summary

This implementation demonstrates:
- Technical achievement 1
- Technical achievement 2
- Technical achievement 3

## Extension Possibilities

- Enhancement 1
- Related implementation 2
- Advanced pattern 3
```

**Example**:
```markdown
# Implementation Guide: Authenticated User Dashboard

Implementation of a complete authenticated dashboard with token management, protected routes, and automatic data synchronization.

**Implementation scope:**
- Authentication flow with token storage
- Protected route configuration
- User profile data fetching with state management
- Error handling and recovery

**Technical concepts covered:**
- IntrigProvider configuration for authentication
- Stateless hooks for mutations
- Stateful hooks for queries
- NetworkState handling patterns

**Prerequisites:**
- React application with routing configured (react-router-dom or equivalent)
- Intrig installed and API source configured
- Understanding of React hooks and component lifecycle

**Estimated time**: 25 minutes

---

## Step 1: Authentication Configuration

Configure the IntrigProvider to manage authentication tokens across all API requests.

Open `src/main.tsx`:

```typescript
import { IntrigProvider } from '@intrig/react';

function App() {
  const token = localStorage.getItem('authToken');
  
  return (
    <IntrigProvider configs={{
      userApi: {
        baseURL: 'https://api.example.com',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      }
    }}>
      <Router />
    </IntrigProvider>
  );
}
```

**Technical rationale**: IntrigProvider establishes global configuration that applies to all generated hooks. Authentication tokens are read from localStorage and included in request headers. In production environments, consider using httpOnly cookies for enhanced security.

**Verification**: Application should compile and run without errors.

## Step 2: Authentication Interface

Implement the login interface using a stateless hook for the authentication mutation.

Create `src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { useLoginAsync } from '@intrig/react/userApi/auth/useLoginAsync';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [login] = useLoginAsync();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await login({ email, password });
      localStorage.setItem('authToken', response.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError('Authentication failed. Verify credentials and retry.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Authenticate</button>
    </form>
  );
}
```

**Technical rationale**: `useLoginAsync` is a stateless hook appropriate for mutation operations. It returns a promise-based interface without state caching, which is suitable for one-time operations like authentication, resource creation, or updates.

**Verification**: Navigate to `/login` route. Form should render and accept input. Submission triggers authentication request to configured API.

## Step 3: Protected Dashboard Implementation

Implement the dashboard component with automatic user data fetching and complete state handling.

Create `src/pages/Dashboard.tsx`:

```typescript
import { useGetCurrentUser } from '@intrig/react/userApi/user/useGetCurrentUser';
import { isPending, isError, isSuccess } from '@intrig/react';

export function Dashboard() {
  const [user] = useGetCurrentUser({ fetchOnMount: true });

  if (isPending(user)) {
    return <div>Loading profile data...</div>;
  }

  if (isError(user)) {
    return (
      <div>
        <p>Error loading profile: {user.error.message}</p>
        <p>Status: {user.error.statusCode}</p>
      </div>
    );
  }

  if (isSuccess(user)) {
    return (
      <div>
        <h1>User Profile: {user.data.name}</h1>
        <dl>
          <dt>Email</dt>
          <dd>{user.data.email}</dd>
          <dt>Account Created</dt>
          <dd>{new Date(user.data.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>
    );
  }

  return null;
}
```

**Technical rationale**:
- `useGetCurrentUser` is a stateful hook that maintains request state in the global store
- `fetchOnMount: true` initiates the request during component mount
- Type guards (`isPending`, `isSuccess`, `isError`) provide type-safe access to state-specific data
- Result caching prevents redundant requests when navigating between views

**Verification**: After successful authentication, dashboard should display user data. Navigating away and returning should not trigger additional requests (verify in browser network tab).

## Step 4: Route Protection

Implement route protection to enforce authentication requirements.

Create `src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
```

Update routing configuration:

```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route 
    path="/dashboard" 
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } 
  />
</Routes>
```

**Technical rationale**: Route protection occurs at the routing level, preventing unauthorized access before component rendering. This pattern separates authentication concerns from business logic.

**Verification**:
- Direct navigation to `/dashboard` without authentication redirects to `/login`
- After authentication, `/dashboard` renders successfully
- Manual removal of token from localStorage triggers redirect

## Implementation Summary

This implementation demonstrates:
- Global authentication configuration through IntrigProvider
- Stateless hooks for mutation operations (authentication)
- Stateful hooks for query operations (user data)
- Complete NetworkState handling with type-safe state access
- Route-level access control

## Extension Possibilities

- Implement automatic token refresh logic
- Add profile editing functionality using `useUpdateUser`
- Implement logout with state cleanup
- Add optimistic updates for profile modifications
- Integrate refresh token rotation

**Related implementations:**
- [Error Handling Patterns](./error-handling.md)
- [Optimistic Updates](./optimistic-updates.md)
- [Token Refresh Strategies](./token-refresh.md)
```

---

### 4. Tool Documentation - Technical Usage Guide

**Purpose**: Document tool capabilities and usage patterns for efficient operation

**Style Characteristics**:
- Clear capability description
- Workflow documentation with technical precision
- Efficient usage patterns
- Troubleshooting procedures
- Professional and direct

**Code Density**: Low-Medium (20-30% of content)

**Template**:
```markdown
# [Tool Name]

[Technical description of tool purpose and capabilities - 2-3 sentences]

**Core capabilities:**
- Capability 1
- Capability 2
- Capability 3

## Basic Usage

[Standard usage pattern]

**Procedure:**
1. [Action 1]
2. [Action 2]
3. [Expected result]

[Technical explanation of behavior]

## Common Workflows

### Workflow 1: [Task Name]

**Use case**: [When this workflow applies]

**Procedure**:
1. [Step 1 with technical detail]
2. [Step 2]
3. [Outcome]

### Workflow 2: [Task Name]

**Use case**: [When this workflow applies]

**Procedure**:
1. [Step 1]
2. [Step 2]
3. [Outcome]

## Advanced Usage

### [Advanced Feature 1]
[Technical description and usage]

### [Advanced Feature 2]
[Technical description and usage]

## Troubleshooting

**Issue**: [Problem description]
**Resolution**: [Solution steps]

**Issue**: [Another problem]
**Resolution**: [Solution steps]

## Performance Considerations

[Relevant performance characteristics or optimization patterns]
```

**Example**:
```markdown
# Intrig Insight

Insight provides searchable API documentation with generated code examples, enabling rapid endpoint discovery and implementation without manual OpenAPI specification review.

**Core capabilities:**
- Full-text search across endpoints, parameters, and response schemas
- Generated TypeScript code with correct type signatures
- Schema visualization for request and response types
- Cross-referenced endpoint relationships

## Basic Usage

Launch Insight daemon:

```bash
intrig insight
```

Insight web interface becomes available at `http://localhost:5050`.

**Standard workflow:**
1. Enter search query (endpoint name, HTTP method, or route pattern)
2. Select endpoint from results
3. Review documentation including parameters and response schema
4. Copy generated implementation code
5. Integrate into application code

The daemon maintains synchronized state with your local API specifications. Changes to specifications require running `intrig sync` followed by daemon restart to reflect updates.

## Common Workflows

### Endpoint Discovery by Name

**Use case**: Locating endpoints when operation name is known but exact hook name is uncertain

**Procedure**:
1. Enter operation name or partial match in search field (e.g., "user", "create")
2. Review result list showing HTTP method, route, and generated hook name
3. Select desired endpoint
4. Access complete documentation and implementation code

Result list displays all matching endpoints with their corresponding generated hook names, enabling direct mapping from API operations to generated code.

### Route-Based Search

**Use case**: Locating generated hooks when backend route is known

**Procedure**:
1. Enter API route pattern in search (e.g., `/api/users/{id}`, `users/{id}`)
2. Select matching result
3. View generated hook name and implementation details

Route search supports partial matching and parameter placeholder recognition.

### Schema Inspection

**Use case**: Understanding request parameters or response structure

**Procedure**:
1. Navigate to endpoint documentation
2. Select schema type from response or parameter section
3. View complete TypeScript interface definition
4. Review JSON Schema validation rules (if applicable)

Schema definitions display complete type information including nested types, enums, and validation constraints defined in the OpenAPI specification.

## Advanced Usage

### Background Operation

Run Insight daemon without opening browser:

```bash
intrig insight --silent
```

Daemon runs in background. Access interface at `http://localhost:5050` as needed.

### HTTP Method Filtering

Search by HTTP method to filter results:

```bash
# In search interface, enter:
POST
```

Returns all POST endpoints, useful for locating mutation operations.

### Programmatic Access

Insight URLs support direct linking for team collaboration:

```
http://localhost:5050/endpoint/{hookName}
```

Share specific endpoint documentation through direct URLs. Recipients require local Insight daemon.

### Keyboard Navigation

Efficient keyboard shortcuts:
- `/` - Focus search input
- `↑` `↓` - Navigate search results
- `Enter` - Open selected endpoint
- `Esc` - Clear search

## Troubleshooting

**Issue**: Insight fails to start
**Resolution**:
1. Verify daemon status: `intrig daemon status`
2. Start daemon if stopped: `intrig daemon up`
3. Check for port conflicts on 5050
4. Review daemon logs: `intrig daemon logs`

**Issue**: Endpoints not appearing in search
**Resolution**:
1. Verify API specifications synchronized: `intrig sync --all`
2. Confirm source configuration: `intrig sources ls`
3. Restart daemon: `intrig daemon restart`
4. Verify OpenAPI specification validity

**Issue**: Generated code not functioning
**Resolution**:
1. Regenerate SDK: `intrig generate`
2. Verify IntrigProvider configuration in application
3. Confirm imports reference correct source identifier
4. Check TypeScript compilation errors for type mismatches

## Performance Considerations

- **Search indexing**: Initial daemon startup indexes all endpoints. Large specifications (>500 endpoints) may require 2-3 seconds for initial index build.
- **Memory usage**: Daemon maintains in-memory index. Typical memory footprint: 50-100MB for moderate-sized APIs.
- **Concurrent access**: Single daemon instance supports multiple browser sessions without performance degradation.

## Related Documentation

- [CLI Reference](../cli-reference.md)
- [Daemon Management](../daemon.md)
- [API Source Configuration](../sources.md)
```

---

## Universal Documentation Standards

These standards apply across all documentation sections:

### Technical Writing Requirements

**Precision and Clarity**:
- Use technically accurate terminology
- Define domain-specific terms on first use
- Maintain consistent terminology throughout
- Avoid ambiguous language
- State facts rather than opinions

**Code Standards**:
- All examples must use TypeScript
- Use semantically meaningful variable names
- Include necessary imports
- Provide complete, runnable examples
- Test all code examples before publication

**Structure**:
- Write in present tense
- Use active voice where clarity benefits
- Limit paragraphs to 2-4 sentences
- Use lists for enumeration, not narrative
- Include verification steps for procedures

### Language to Avoid

Do not use colloquial or informal language:

❌ **Avoid**:
- "simply", "just", "easily", "obviously"
- "let's", "we'll", "you'll"
- Exclamation marks
- Rhetorical questions
- Anthropomorphization ("TypeScript screams", "code complains")
- Marketing language ("powerful", "amazing", "revolutionary")
- Apologetic phrasing ("unfortunately", "sadly")

✅ **Use**:
- Direct statements
- Technical precision
- Measurable claims
- Factual descriptions

### Documentation of Trade-offs

Present trade-offs factually with solutions:

**Structure**: Technical cost → Mitigation approach

**Example**:
```markdown
## Build Process Integration

Generated SDK resides in `node_modules` and is removed during dependency reinstallation.

**Integration approach**:
```json
{
  "scripts": {
    "postinstall": "intrig generate"
  }
}
```

The `postinstall` hook ensures SDK availability following dependency operations.
```

### Abstracts vs. Verbose Introductions

Use concise technical abstracts rather than extended introductions:

❌ **Avoid**:
```markdown
# State Management

Welcome to the comprehensive guide on Intrig's state management system. 
In this guide, we will explore the various aspects of state management 
and how Intrig provides powerful capabilities to manage state effectively 
in your applications. Understanding state management is crucial for 
building robust applications...
```

✅ **Use**:
```markdown
# State Management

Intrig maintains network request state in a global store, keyed by endpoint identifier and optional isolation key. Multiple components accessing the same key observe shared state without duplicate network requests.

```typescript
// Component A initiates request
const [users] = useGetUsers({ fetchOnMount: true });

// Component B observes same state
const [users] = useGetUsers();
```

State transitions follow the NetworkState state machine. Components receive updates when state changes occur.

[Detailed technical explanation follows...]
```

---

## Code Example Standards

### Show Generated Artifacts

Demonstrate generated code to establish technical credibility:

```markdown
## Code Generation

**OpenAPI specification**:
```yaml
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

**Generated TypeScript hook**:
```typescript
function useGetUser(
  options?: UnaryHookOptions<GetUserParams>
): [
  NetworkState<User>,
  (params: GetUserParams) => void,
  () => void
]

interface GetUserParams {
  id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  // Additional fields from schema
}
```

Generated code provides full type safety with direct mapping to OpenAPI specification.
```

### Progressive Disclosure

Present increasing complexity through collapsible sections:

```markdown
## Basic Usage

```typescript
const [user] = useGetUser({ params: { id: '123' } });
```

<details>
<summary>Complete implementation with state handling</summary>

```typescript
const [user, getUser, clearUser] = useGetUser();

useEffect(() => {
  getUser({ id: userId });
}, [userId]);

if (isPending(user)) {
  return <LoadingIndicator />;
}

if (isError(user)) {
  return (
    <ErrorDisplay 
      error={user.error}
      onRetry={() => getUser({ id: userId })}
    />
  );
}

if (isSuccess(user)) {
  return <UserProfile data={user.data} />;
}

return null;
```
</details>
```

### Technical Accuracy in Examples

Ensure examples demonstrate production-ready patterns:

✅ **Production-ready**:
```typescript
// Authentication token from login response
const [loginState, login] = useLoginAsync();

useEffect(() => {
  if (isSuccess(loginState)) {
    const { accessToken, refreshToken } = loginState.data;
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);
    navigate('/dashboard');
  }
}, [loginState, navigate]);
```

❌ **Avoid**:
```typescript
// This shows how to use the hook!
const [x, y] = useLoginAsync(); // x is state, y is function

// When it works, get the data
if (isSuccess(x)) {
  const myToken = x.data.accessToken; // Save the token!
  // TODO: Navigate somewhere
}
```

---

## Docusaurus Integration

### Directory Structure
```
app/docs/docs/
├── intro.md                    # Landing page
├── getting-started.md          # Initial setup
├── cli-reference.mdx           # CLI documentation
├── architecture/               # System architecture
│   ├── overview.md
│   ├── synchronization.md
│   └── code-generation.md
├── react/                      # React integration
│   ├── core-concepts/
│   ├── api/
│   ├── guides/
│   └── reference/
└── next/                       # Next.js integration
    ├── core-concepts/
    ├── api/
    ├── guides/
    └── reference/
```

### Frontmatter Standards

Maintain consistent frontmatter:

```yaml
---
sidebar_position: 1
title: Technical Documentation Title
description: Brief technical description for SEO
---
```

### Internal Linking

Use relative paths for maintainability:

```markdown
- Same directory: [NetworkState](./network-state.md)
- Parent directory: [Core Concepts](../core-concepts.md)
- Subdirectory: [Advanced Patterns](./advanced/patterns.md)
```

### Docusaurus Components

#### Admonitions

```markdown
:::note Technical Note
This behavior is specific to React 18+ concurrent features.
:::

:::warning Breaking Change
Version 2.0 introduces breaking changes to the authentication configuration.
:::

:::info Implementation Detail
The daemon maintains persistent WebSocket connections for real-time updates.
:::
```

#### Package Manager Tabs

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @intrig/react
    ```
  </TabItem>
  <TabItem value="yarn" label="Yarn">
    ```bash
    yarn add @intrig/react
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add @intrig/react
    ```
  </TabItem>
</Tabs>
```

---

## Quality Assurance Checklist

### Content Verification
- [ ] Documentation type matches section purpose (intro/reference/guide/tool)
- [ ] Technical accuracy verified
- [ ] All code examples tested and functional
- [ ] Trade-offs documented with solutions
- [ ] No marketing language or colloquialisms
- [ ] Technical terms defined on first use
- [ ] Consistent terminology throughout

### Code Quality
- [ ] TypeScript (not JavaScript) in all examples
- [ ] Semantically meaningful variable names
- [ ] All necessary imports included
- [ ] Examples are complete and runnable
- [ ] Type annotations present where beneficial
- [ ] Syntax highlighting correct

### Structure
- [ ] Professional tone maintained
- [ ] Present tense used consistently
- [ ] Paragraphs limited to 2-4 sentences
- [ ] Lists used for enumeration
- [ ] No verbose introductions
- [ ] Technical abstract provided (1-3 sentences)

### Docusaurus Integration
- [ ] Frontmatter correct and complete
- [ ] Relative links functional
- [ ] Admonitions used appropriately
- [ ] No broken internal links
- [ ] Media references correct

### Audience Appropriateness
- [ ] Assumes domain knowledge (no basic concepts explained)
- [ ] Technical depth appropriate for software engineers
- [ ] Professional tone throughout
- [ ] Factual rather than persuasive
- [ ] Implementation-focused

---

## Documentation Section Summary

| Section Type | Code Density | Technical Depth | Primary Purpose |
|--------------|--------------|-----------------|-----------------|
| **Introduction/Concepts** | 10-20% | Architectural | Problem space and approach |
| **API Reference** | 60-70% | Complete specification | Technical lookup |
| **Implementation Guides** | 50-60% | Applied | Feature implementation |
| **Tool Documentation** | 20-30% | Operational | Efficient tool usage |

---

## Fundamental Principle

**Documentation serves engineering evaluation and implementation, not marketing or persuasion.**

Provide:
- Technical accuracy
- Complete specification
- Clear procedures
- Measurable characteristics
- Honest trade-off analysis

Avoid:
- Marketing language
- Enthusiasm over precision
- Persuasion over information
- Simplification that obscures complexity
- Assumptions about reader motivation

Professional software engineers evaluating infrastructure tooling require precise, complete, technically accurate documentation. Maintain this standard consistently across all documentation types.