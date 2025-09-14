# Initialization

This guide walks you through setting up Intrig in a React application, from installation to configuration.

## 1. Install @intrig/core

First, install the Intrig core package as a development dependency in your React project:

```bash
npm install --save-dev @intrig/core
```

The `@intrig/core` package provides the CLI tools and core functionality needed to generate type-safe API clients for your React application.

## 2. Initialize Intrig

Run the initialization command in your project root:

```bash
intrig init
```

### What happens during initialization

When you run `intrig init`, the following steps occur automatically:

1. **Plugin Detection & Selection**: Intrig analyzes your `package.json` to detect your project type and suggests compatible plugins. For React projects, it will recommend the React plugin (`@intrig/plugin-react`).

2. **Plugin Installation**: The selected plugin and `@intrig/core` are installed as development dependencies in your project.

3. **Configuration Setup**: 
   - Creates an `intrig.config.json` file in your project root with basic configuration
   - Generates a JSON schema file at `.intrig/schema.json` for IDE support and validation
   - Updates your `.gitignore` to exclude generated files

4. **File Generation**: Sets up the directory structure for generated API clients and type definitions.

The initialization process is interactive and will guide you through any necessary configuration options specific to your project setup.

## 3. Post-initialization Steps

After running `intrig init`, you need to integrate Intrig into your React application:

### Add IntrigProvider to your component hierarchy

Wrap your root React component with `IntrigProvider` to enable Intrig functionality throughout your application:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { IntrigProvider } from '@intrig/react';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <IntrigProvider
    configs={{
      default: {
        baseURL: 'https://api.yourservice.com',
        timeout: 5000,
      }
    }}
  >
    <App />
  </IntrigProvider>
);
```

The `IntrigProvider` should be placed at the root of your React component hierarchy to ensure all child components have access to Intrig's functionality.

### Configuration Options

You can configure multiple API sources and customize behavior:

```jsx
<IntrigProvider
  configs={{
    userAPI: {
      baseURL: 'https://users-api.example.com',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    },
    analyticsAPI: {
      baseURL: 'https://analytics.example.com',
      debounceDelay: 500,
    },
  }}
>
  <App />
</IntrigProvider>
```

For more detailed information about `IntrigProvider` configuration options, refer to the [IntrigProvider documentation](./api/intrig-provider.md).

## Next Steps

Once initialization is complete and `IntrigProvider` is set up:

1. Add API sources to your `intrig.config.json`
2. Run `intrig sync` to fetch API specifications
3. Run `intrig generate` to create type-safe API clients
4. Start using the generated hooks and clients in your React components

For more information on these next steps, see the [Getting Started guide](../getting-started.md).