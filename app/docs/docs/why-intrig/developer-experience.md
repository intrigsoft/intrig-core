---
sidebar_position: 4
---

# Developer Experience

Intrig is built with developer experience as the top priority. Every feature, every API, and every generated piece of code is designed to make developers more productive and happy.

## Core Principles

### 1. Zero Configuration
Intrig works out of the box without complex setup or configuration files.

```bash
# Traditional approach - multiple config files needed
openapi-generator-cli generate \
  -i api-spec.yaml \
  -g typescript-fetch \
  -o ./sdk \
  --additional-properties=typescriptThreePlus=true,supportsES6=true
```

```bash
# Intrig approach - just works
intrig sync --all && intrig generate
```

### 2. Intelligent Defaults
Every generated SDK uses sensible defaults while remaining customizable when needed.

```typescript
// Automatic error handling, retries, and type safety
const users = await intrig.users.list(); // Just works!

// Customizable when needed
const customUsers = await intrig.users.list({
  retries: 3,
  timeout: 5000,
  signal: abortController.signal
});
```

### 3. Framework Native
Generated code feels like it was hand-written for each framework.

**React Example:**
```tsx
function UsersList() {
  const { data: users, loading, error } = useUsers();
  
  if (loading) return <Loading />;
  if (error) return <Error error={error} />;
  
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```


## Developer Workflow Benefits

### Instant Feedback Loop

```mermaid
graph LR
    A[Change Backend] --> B[Restart App]
    B --> C[Sync & Generate]
    C --> D[TypeScript Errors]
    D --> E[Fix Issues]
    E --> F[Working Code]
```

**Traditional workflow:** Hours or days to discover breaking changes
**Intrig workflow:** Seconds to get feedback on API changes

### Rich TypeScript Support

```typescript
// Full IntelliSense and type checking
const user = await intrig.users.create({
  name: "John Doe",
  email: "john@example.com",
  age: 30 // TypeScript knows this field exists and its type
});

// Compile-time error prevention - This would show TypeScript errors
// const invalidUser = await intrig.users.create({
//   name: "John Doe",
//   email: "invalid-email", // TypeScript error: invalid email format
//   invalidField: "value"   // TypeScript error: property doesn't exist
// });
```

### Debugging Excellence

#### Meaningful Error Messages
```typescript
try {
  await intrig.users.create(userData);
} catch (error) {
  // Rich error information
  console.log(error.status);     // 422
  console.log(error.message);    // "Validation failed"
  console.log(error.details);    // { email: ["Invalid format"] }
  console.log(error.requestId);  // "req_abc123"
}
```

#### Request/Response Inspection
```typescript
// Built-in request/response logging
intrig.config.debug = true;

// Automatic request ID tracking
const response = await intrig.users.create(userData);
console.log(response.meta.requestId); // Trace requests across systems
```

## IDE Integration

### Auto-completion
- Full IntelliSense for all API endpoints
- Parameter suggestions with documentation
- Return type information

### Inline Documentation
```typescript
/**
 * Create a new user account
 * @param userData - User information
 * @returns Promise<User> - The created user
 * @throws {ValidationError} - When user data is invalid
 * @throws {ConflictError} - When user already exists
 */
await intrig.users.create(userData);
```

### Refactoring Support
- Rename API endpoints across your entire codebase
- Find all usages of specific endpoints
- Safe refactoring with TypeScript

## CLI Experience

### Exploration Commands
```bash
# Search for endpoints
intrig search "users" --no-interactive

# View endpoint details
intrig view endpoint_id --type "endpoint" --tab-option 1

# List all available resources
intrig ls --format table
```

### Interactive Help
```bash
# Context-aware help
intrig generate --help

# Interactive command selection
intrig
? What would you like to do?
  > Sync API changes
    Generate SDK
    Explore endpoints
    View documentation
```

## Performance Optimizations

### Smart Caching
- Intelligent request deduplication
- Automatic background refresh
- Optimistic updates

### Bundle Size
- Tree-shakeable generated code
- Only import what you use
- Minimal runtime overhead

### Network Efficiency
- Automatic request batching
- Intelligent retry strategies
- Connection pooling

## Developer Testimonials

> "Intrig eliminated weeks of integration work. What used to take our team days now takes minutes." - Sarah, Frontend Lead

> "The TypeScript support is incredible. We catch API contract violations at compile time instead of in production." - Mike, Full Stack Developer

> "Finally, an API tool that actually improves our developer experience instead of adding complexity." - Jennifer, Engineering Manager

The result is a development experience that feels magical—where the tools get out of your way and let you focus on building great features.