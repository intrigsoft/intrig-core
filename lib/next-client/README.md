# @intrig/next

This library serves as the placeholder for Intrig generated Next.js content. It provides the necessary infrastructure and utilities for integrating with Next.js applications.

## Overview

@intrig/next is designed to work seamlessly with the Intrig Core ecosystem, providing specialized support for Next.js applications. When you generate code using Intrig with the Next.js generator, this library provides the foundation for that generated code.

## Features

- **Next.js Integration**: Specialized utilities for Next.js applications
- **Server-Side Rendering Support**: Optimized for Next.js SSR capabilities
- **API Route Helpers**: Utilities for working with Next.js API routes
- **Type Safety**: Full TypeScript support for all components

## Installation

```bash
npm install @intrig/next
```

## Usage

The library is primarily used as a dependency for Intrig generated code. When you generate code using Intrig with the Next.js generator, it will automatically use this library.

```typescript
// Example of importing from the library
import { createNextClient } from '@intrig/next';

// Usage in your Next.js application
const client = createNextClient({
  // Configuration options
});
```

## Documentation

For more detailed documentation, please refer to the [Intrig Core documentation](https://docs.intrig.io).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
