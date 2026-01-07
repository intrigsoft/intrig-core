# Authentication

Intrig uses Axios under the hood. Authentication is configured through the `IntrigProvider` configs, which accept all Axios configuration options plus interceptors for dynamic auth scenarios.

Configuration layers:
- `configs.defaults` — applies to all API sources
- `configs[sourceName]` — source-specific configuration (merges with/overrides defaults)

## Configuration Interface

```typescript
interface DefaultConfigs extends CreateAxiosDefaults {
  debounceDelay?: number;
  requestInterceptor?: (
    config: InternalAxiosRequestConfig,
  ) => Promise<InternalAxiosRequestConfig>;
  responseInterceptor?: (
    config: AxiosResponse<any>,
  ) => Promise<AxiosResponse<any>>;
}
```

Since `DefaultConfigs` extends Axios's `CreateAxiosDefaults`, all standard Axios options are available:
- `headers` — default headers for all requests
- `baseURL` — base URL for requests
- `timeout` — request timeout
- `withCredentials` — send cookies cross-origin
- And all other Axios config options

## Static Authentication

For APIs with static credentials (API keys, fixed tokens):

### API Key in Header

```typescript
<IntrigProvider
  configs={{
    my_api: {
      headers: {
        'X-API-Key': 'your-api-key',
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

### Bearer Token

```typescript
<IntrigProvider
  configs={{
    my_api: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

### Basic Auth

```typescript
<IntrigProvider
  configs={{
    my_api: {
      auth: {
        username: 'user',
        password: 'pass',
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

## Dynamic Authentication

For tokens that change (user sessions, refresh tokens), use `requestInterceptor`:

### Token from Storage

```typescript
<IntrigProvider
  configs={{
    my_api: {
      async requestInterceptor(config) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

### Token from Auth Context

```typescript
function AuthenticatedProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();

  const configs = useMemo(() => ({
    my_api: {
      async requestInterceptor(config) {
        const token = await getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
    },
  }), [getAccessToken]);

  return (
    <IntrigProvider configs={configs}>
      {children}
    </IntrigProvider>
  );
}
```

## Token Refresh

Use `responseInterceptor` to handle token refresh on 401:

```typescript
function AuthenticatedProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, refreshToken } = useAuth();

  const configs = useMemo(() => ({
    my_api: {
      async requestInterceptor(config) {
        const token = await getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      async responseInterceptor(response) {
        // Success responses pass through
        return response;
      },
    },
  }), [getAccessToken]);

  return (
    <IntrigProvider configs={configs}>
      {children}
    </IntrigProvider>
  );
}
```

:::note
The response interceptor only handles successful responses. For 401 handling, you'll need to catch errors at the hook level or use a central error handler:
:::

```typescript
function useAuthErrorHandler() {
  const errors = useCentralError();
  const { refreshToken, logout } = useAuth();

  useEffect(() => {
    const authError = errors.find(
      e => isHttpError(e.error) && e.error.status === 401
    );

    if (authError) {
      refreshToken().catch(() => logout());
    }
  }, [errors]);
}
```

## Multiple API Sources

Configure different auth for each source:

```typescript
<IntrigProvider
  configs={{
    // Shared defaults
    defaults: {
      timeout: 30000,
    },

    // Public API — API key
    public_api: {
      headers: {
        'X-API-Key': process.env.REACT_APP_PUBLIC_API_KEY,
      },
    },

    // Internal API — Bearer token
    internal_api: {
      async requestInterceptor(config) {
        const token = await getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
    },

    // Third-party API — Basic auth
    vendor_api: {
      auth: {
        username: process.env.REACT_APP_VENDOR_USER,
        password: process.env.REACT_APP_VENDOR_PASS,
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

## Interceptor Chain

When both `defaults` and source-specific interceptors are defined, they chain:

1. `defaults.requestInterceptor` runs first
2. Source-specific `requestInterceptor` runs second (receives output of step 1)

```typescript
<IntrigProvider
  configs={{
    defaults: {
      async requestInterceptor(config) {
        // Runs first — add correlation ID to all requests
        config.headers['X-Correlation-ID'] = generateCorrelationId();
        return config;
      },
    },
    my_api: {
      async requestInterceptor(config) {
        // Runs second — config already has correlation ID
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

The same chaining applies to `responseInterceptor`.

## Cookies and Credentials

For cookie-based auth (session cookies, CSRF):

```typescript
<IntrigProvider
  configs={{
    my_api: {
      withCredentials: true,  // Send cookies cross-origin
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    },
  }}
>
  {children}
</IntrigProvider>
```

## Common Patterns

### Wrapper Component for Authenticated Sections

```typescript
function AuthenticatedApp() {
  const { isAuthenticated, token } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <IntrigProvider
      configs={{
        my_api: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }}
    >
      <AppRoutes />
    </IntrigProvider>
  );
}
```

### Re-mounting Provider on Token Change

If your token changes and you need to reset all cached state:

```typescript
function AuthenticatedApp() {
  const { token } = useAuth();

  // Key change forces remount, clearing all state
  return (
    <IntrigProvider
      key={token}
      configs={{
        my_api: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }}
    >
      <AppRoutes />
    </IntrigProvider>
  );
}
```
