# Initialization

This guide walks you through setting up Intrig in a Next.js application, from installation to configuration for App Router.

## 1. Install @intrig/core

First, install the Intrig core package as a development dependency in your Next.js project:

```bash
npm install --save-dev @intrig/core
```

The `@intrig/core` package provides the CLI tools and core functionality needed to generate type-safe API clients for your Next.js application.

## 2. Initialize Intrig

Run the initialization command in your project root:

```bash
intrig init
```

### What happens during initialization

When you run `intrig init`, the following steps occur automatically:

1. **Plugin Detection & Selection**: Intrig analyzes your `package.json` to detect your project type and suggests compatible plugins. For Next.js projects, it will recommend the Next.js plugin (`@intrig/plugin-next`).

2. **Plugin Installation**: The selected plugin and `@intrig/core` are installed as development dependencies in your project.

3. **Configuration Setup**: 
   - Creates an `intrig.config.json` file in your project root with basic configuration
   - Generates a JSON schema file at `.intrig/schema.json` for IDE support and validation
   - Updates your `.gitignore` to exclude generated files
   - Configures for App Router projects

4. **File Generation**: Sets up the directory structure for generated API clients, server functions, and type definitions optimized for Next.js.

The initialization process is interactive and will guide you through any necessary configuration options specific to your Next.js setup.

## 3. Post-initialization Steps

After running `intrig init`, you need to integrate Intrig into your Next.js application:

### App Router Setup

For Next.js App Router, wrap your root layout with `IntrigLayout`:

```tsx
// app/layout.tsx
import { IntrigLayout } from '@intrig/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <IntrigLayout
          configs={{
            
          }}
        >
          {children}
        </IntrigLayout>
      </body>
    </html>
  );
}
```


### Server-Side Configuration

For API routes and server components, configure your API endpoints using environment variables:

```env
# .env.local
DEFAULT_API_URL=https://api.yourservice.com
USERS_API_URL=https://users-api.example.com
ANALYTICS_API_URL=https://analytics.example.com
```

For authentication headers and other dynamic headers, use Intrig middleware:

```ts
// middleware.ts
import { createIntrigMiddleware } from '@intrig/next';

export const middleware = createIntrigMiddleware(async (request) => {
  // Return headers that will be available to server functions
  return {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'X-User-ID': request.headers.get('x-user-id') || '',
    // Add other dynamic headers as needed
  };
});

export const config = {
  matcher: '/api/:path*',
};
```


## Next Steps

Once initialization is complete and `IntrigLayout` is set up:

1. Add API sources to your `intrig.config.json`
2. Run `intrig sync` to fetch API specifications
3. Run `intrig generate` to create type-safe API clients and server functions
4. Start using the generated hooks in components and server functions in API routes
5. Configure middleware if needed for authentication or request processing

For more information on these next steps, see the [Getting Started guide](../getting-started.md).