# IntrigProvider

The **IntrigProvider** is the foundational context provider component for integrating Intrig into React applications. It sets up global state management for network requests and provides configured Axios instances for API communication.

## Overview

IntrigProvider serves as the entry point for all Intrig functionality, managing:
- Global network state across your application
- Axios instances with custom configurations per API source
- Request/response interceptors
- Error handling and validation
- Support for streaming responses (Server-Sent Events)

## Props

### `IntrigProviderProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | Child components that will have access to Intrig context |
| `configs` | `Record<string, DefaultConfigs>` | No | `{}` | Configuration object for different API sources |

### `DefaultConfigs`

The `DefaultConfigs` interface extends Axios's `CreateAxiosDefaults` with additional Intrig-specific options:

| Property | Type | Description |
|----------|------|-------------|
| `baseURL` | `string` | Base URL for API requests |
| `timeout` | `number` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | Default headers for requests |
| `debounceDelay` | `number` | Delay in milliseconds for debouncing requests |
| `requestInterceptor` | `(config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>` | Custom request interceptor function |
| `responseInterceptor` | `(config: AxiosResponse<any>) => Promise<AxiosResponse<any>>` | Custom response interceptor function |

## Basic Usage

### Simple Setup

```jsx
import React from 'react';
import { IntrigProvider } from '@intrig/react';
import App from './App';

function Root() {
  return (
    <IntrigProvider
      configs={{
        default: {
          baseURL: 'https://api.example.com',
          timeout: 5000,
        }
      }}
    >
      <App />
    </IntrigProvider>
  );
}

export default Root;
```

### Multiple API Sources

```jsx
import React from 'react';
import { IntrigProvider } from '@intrig/react';
import App from './App';

function Root() {
  return (
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
          headers: {
            'Authorization': 'Bearer token',
          },
          debounceDelay: 500,
        },
      }}
    >
      <App />
    </IntrigProvider>
  );
}

export default Root;
```

### With Interceptors

```jsx
import React from 'react';
import { IntrigProvider } from '@intrig/react';
import App from './App';

function Root() {
  const configs = {
    default: {
      baseURL: 'https://api.example.com',
      requestInterceptor: async (config) => {
        // Add authentication token
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      responseInterceptor: async (response) => {
        // Log successful responses
        console.log('Response received:', response.status);
        return response;
      },
    },
  };

  return (
    <IntrigProvider configs={configs}>
      <App />
    </IntrigProvider>
  );
}

export default Root;
```

## Testing with IntrigProviderStub

For testing purposes, Intrig provides `IntrigProviderStub` which allows you to mock API responses:

### `IntrigProviderStubProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | Child components for testing |
| `configs` | `DefaultConfigs` | No | `{}` | Configuration for the stub provider |
| `stubs` | `(stub: StubType) => void` | No | `() => {}` | Function to define mock responses |

### Testing Example

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntrigProviderStub } from '@intrig/react';
import { useGetUsers } from './generated/hooks';
import UserList from './UserList';

test('displays user list', async () => {
  const mockUsers = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
  ];

  render(
    <IntrigProviderStub
      stubs={(stub) => {
        stub(useGetUsers, async (params, body, dispatch) => {
          dispatch({ type: 'success', data: mockUsers });
        });
      }}
    >
      <UserList />
    </IntrigProviderStub>
  );

  // Test assertions here
});
```

## Advanced Features

### Streaming Support

IntrigProvider automatically handles Server-Sent Events (SSE) when the response contains `text/event-stream` content type:

```jsx
// The provider automatically detects and handles streaming responses
// Your hooks will receive progressive updates through the dispatch mechanism
```

### Error Handling

The provider includes comprehensive error handling with support for custom error schemas:

- Axios errors are automatically caught and processed
- Validation errors from Zod schemas are handled gracefully
- Custom error types can be defined per API source

### State Management

IntrigProvider maintains global state for all network requests, indexed by:
- Source (API configuration name)
- Operation (HTTP method + endpoint)
- Key (unique identifier for the request)

This enables features like:
- Automatic request deduplication
- Consistent loading states
- Error state management
- Response caching

## Integration Patterns

### With Next.js

```jsx
// pages/_app.js
import { IntrigProvider } from '@intrig/react';

function MyApp({ Component, pageProps }) {
  return (
    <IntrigProvider
      configs={{
        default: {
          baseURL: process.env.NEXT_PUBLIC_API_URL,
        }
      }}
    >
      <Component {...pageProps} />
    </IntrigProvider>
  );
}

export default MyApp;
```

### With Authentication

```jsx
import React, { useEffect, useState } from 'react';
import { IntrigProvider } from '@intrig/react';
import { useAuth } from './auth-context';

function AppProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    setConfigs({
      default: {
        baseURL: 'https://api.example.com',
        requestInterceptor: async (config) => {
          if (isAuthenticated && token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
      },
    });
  }, [token, isAuthenticated]);

  return (
    <IntrigProvider configs={configs}>
      {children}
    </IntrigProvider>
  );
}
```

## Best Practices

1. **Single Provider**: Use only one IntrigProvider at the root of your application
2. **Environment Variables**: Store API URLs and sensitive configuration in environment variables
3. **Error Boundaries**: Wrap your application with error boundaries to handle unexpected errors
4. **Type Safety**: Use TypeScript for better type safety with your API configurations
5. **Testing**: Use IntrigProviderStub for comprehensive testing of components that use Intrig hooks
6. **Interceptors**: Leverage request/response interceptors for cross-cutting concerns like authentication and logging

## Related

- [Hook Conventions](/docs/react/core-concepts/hook-conventions) - Learn how hooks consume IntrigProvider configuration
- [Entry Point](/docs/react/core-concepts/entry-point) - Understand IntrigProvider's role as the application entry point
- [Network State](/docs/react/api/network-state) - Deep dive into state management patterns