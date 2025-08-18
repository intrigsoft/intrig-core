# isInit

The **isInit** function is a TypeScript type guard that checks whether a `NetworkState` represents the initial state of an API request that hasn't been started yet. It provides type-safe identification of uninitialized network requests by narrowing the type from a general `NetworkState<T, E>` to a specific `InitState<T, E>`.

## Overview

`isInit` is essential for handling the initial state of network requests in your React components. It ensures that you can safely identify when a request hasn't been made yet, allowing you to show appropriate UI states like "ready to load" messages, initial data entry forms, or call-to-action buttons.

## Function Signature

```typescript
function isInit<T, E = unknown>(
  state: NetworkState<T, E>
): state is InitState<T, E>
```

### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `T` | The type of the successful response data |
| `E` | The type of the error (defaults to `unknown`) |

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `NetworkState<T, E>` | The network state to check |

### Returns

| Type | Description |
|------|-------------|
| `state is InitState<T, E>` | Type predicate that narrows the state to `InitState<T, E>` when `true` |

## InitState Interface

When `isInit` returns `true`, the state is narrowed to `InitState<T, E>` which includes:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'init'` | Always `'init'` for initial states |

Note: The init state is the simplest of all network states, containing only the state indicator.

## Basic Usage

### Initial Load Button

```jsx
import React from 'react';
import { useGetUsers, isInit, isPending, isSuccess, isError } from '@intrig/react';

function UsersList() {
  const [usersResponse, fetchUsers] = useGetUsers({
    fetchOnMount: false // Don't auto-fetch, let user trigger
  });

  if (isInit(usersResponse)) {
    // TypeScript now knows this is the initial state
    return (
      <div className="initial-state">
        <h2>Users</h2>
        <p>Click the button below to load users.</p>
        <button onClick={() => fetchUsers()}>
          Load Users
        </button>
      </div>
    );
  }

  if (isPending(usersResponse)) {
    return <div>Loading users...</div>;
  }

  if (isError(usersResponse)) {
    return (
      <div className="error">
        <p>Failed to load users</p>
        <button onClick={() => fetchUsers()}>Try Again</button>
      </div>
    );
  }

  if (isSuccess(usersResponse)) {
    return (
      <div>
        <h2>Users ({usersResponse.data.length})</h2>
        <ul>
          {usersResponse.data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
```

### Conditional Form Display

```jsx
import React, { useState } from 'react';
import { useCreateUser, isInit, isPending, isSuccess, isError } from '@intrig/react';

function CreateUserForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [createResponse, createUser] = useCreateUser({
    fetchOnMount: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createUser({ body: formData });
  };

  if (isInit(createResponse)) {
    return (
      <form onSubmit={handleSubmit} className="user-form">
        <h3>Create New User</h3>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        <button type="submit">Create User</button>
      </form>
    );
  }

  if (isPending(createResponse)) {
    return <div>Creating user...</div>;
  }

  if (isError(createResponse)) {
    return (
      <div className="error">
        <p>Failed to create user</p>
        <button onClick={() => window.location.reload()}>
          Reset Form
        </button>
      </div>
    );
  }

  if (isSuccess(createResponse)) {
    return (
      <div className="success">
        <h3>User Created Successfully!</h3>
        <p>User {createResponse.data.name} has been created.</p>
        <button onClick={() => window.location.reload()}>
          Create Another User
        </button>
      </div>
    );
  }

  return null;
}
```

### Search with Manual Trigger

```jsx
import React, { useState } from 'react';
import { useSearchUsers, isInit, isPending, isSuccess } from '@intrig/react';

function UserSearch() {
  const [query, setQuery] = useState('');
  const [searchResponse, searchUsers] = useSearchUsers({
    fetchOnMount: false
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchUsers({ params: { q: query.trim() } });
    }
  };

  return (
    <div className="user-search">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search term..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          onClick={handleSearch}
          disabled={!query.trim() || isPending(searchResponse)}
        >
          Search
        </button>
      </div>

      {isInit(searchResponse) && (
        <div className="search-prompt">
          <p>Enter a search term and click "Search" to find users.</p>
        </div>
      )}

      {isPending(searchResponse) && (
        <div>Searching for "{query}"...</div>
      )}

      {isSuccess(searchResponse) && (
        <div className="search-results">
          <h3>Search Results ({searchResponse.data.length})</h3>
          <ul>
            {searchResponse.data.map(user => (
              <li key={user.id}>{user.name} - {user.email}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Advanced Usage

### Multi-Step Wizard

```jsx
import React, { useState } from 'react';
import { 
  useCreateProject, 
  useUploadFiles, 
  useSetupProject,
  isInit, 
  isPending, 
  isSuccess, 
  isError 
} from '@intrig/react';

function ProjectWizard() {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({});
  
  const [createResponse, createProject] = useCreateProject({ fetchOnMount: false });
  const [uploadResponse, uploadFiles] = useUploadFiles({ fetchOnMount: false });
  const [setupResponse, setupProject] = useSetupProject({ fetchOnMount: false });

  const renderStep1 = () => (
    <div className="wizard-step">
      <h2>Step 1: Project Details</h2>
      {isInit(createResponse) && (
        <form onSubmit={(e) => {
          e.preventDefault();
          createProject({ body: projectData });
        }}>
          <input
            placeholder="Project Name"
            onChange={(e) => setProjectData({...projectData, name: e.target.value})}
          />
          <button type="submit">Create Project</button>
        </form>
      )}
      
      {isPending(createResponse) && <div>Creating project...</div>}
      
      {isSuccess(createResponse) && (
        <div>
          <p>Project created successfully!</p>
          <button onClick={() => setStep(2)}>Next Step</button>
        </div>
      )}
      
      {isError(createResponse) && <div>Failed to create project</div>}
    </div>
  );

  const renderStep2 = () => (
    <div className="wizard-step">
      <h2>Step 2: Upload Files</h2>
      {isInit(uploadResponse) && (
        <div>
          <input type="file" multiple onChange={(e) => {
            uploadFiles({ body: { files: e.target.files } });
          }} />
          <p>Select files to upload</p>
        </div>
      )}
      
      {isPending(uploadResponse) && <div>Uploading files...</div>}
      
      {isSuccess(uploadResponse) && (
        <div>
          <p>Files uploaded successfully!</p>
          <button onClick={() => setStep(3)}>Next Step</button>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="wizard-step">
      <h2>Step 3: Setup Project</h2>
      {isInit(setupResponse) && (
        <button onClick={() => setupProject()}>
          Initialize Project Setup
        </button>
      )}
      
      {isPending(setupResponse) && <div>Setting up project...</div>}
      
      {isSuccess(setupResponse) && (
        <div>
          <h3>Project Setup Complete!</h3>
          <p>Your project is ready to use.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="project-wizard">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}
```

### Lazy Loading Data

```jsx
import React, { useState } from 'react';
import { useGetUserDetails, isInit, isPending, isSuccess } from '@intrig/react';

function UserCard({ user }) {
  const [showDetails, setShowDetails] = useState(false);
  const [detailsResponse, fetchDetails] = useGetUserDetails({
    fetchOnMount: false
  });

  const handleShowDetails = () => {
    setShowDetails(true);
    if (isInit(detailsResponse)) {
      fetchDetails({ params: { userId: user.id } });
    }
  };

  return (
    <div className="user-card">
      <div className="user-summary">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <button onClick={handleShowDetails}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {showDetails && (
        <div className="user-details">
          {isInit(detailsResponse) && (
            <div className="details-placeholder">
              <p>Loading user details...</p>
            </div>
          )}

          {isPending(detailsResponse) && (
            <div className="details-loading">
              <div className="spinner" />
              <p>Fetching details...</p>
            </div>
          )}

          {isSuccess(detailsResponse) && (
            <div className="details-content">
              <h4>Additional Information</h4>
              <p>Phone: {detailsResponse.data.phone}</p>
              <p>Department: {detailsResponse.data.department}</p>
              <p>Join Date: {detailsResponse.data.joinDate}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Conditional Data Fetching

```jsx
import React, { useState, useEffect } from 'react';
import { useGetData, isInit, isPending, isSuccess } from '@intrig/react';

function ConditionalDataLoader({ shouldLoad, dataId }) {
  const [dataResponse, fetchData] = useGetData({
    fetchOnMount: false
  });

  useEffect(() => {
    if (shouldLoad && dataId && isInit(dataResponse)) {
      fetchData({ params: { id: dataId } });
    }
  }, [shouldLoad, dataId, dataResponse, fetchData]);

  if (!shouldLoad) {
    return <div>Data loading is disabled</div>;
  }

  if (!dataId) {
    return <div>No data ID provided</div>;
  }

  if (isInit(dataResponse)) {
    return (
      <div className="ready-to-load">
        <p>Ready to load data for ID: {dataId}</p>
        <button onClick={() => fetchData({ params: { id: dataId } })}>
          Load Now
        </button>
      </div>
    );
  }

  if (isPending(dataResponse)) {
    return <div>Loading data...</div>;
  }

  if (isSuccess(dataResponse)) {
    return (
      <div>
        <h3>Data Loaded</h3>
        <pre>{JSON.stringify(dataResponse.data, null, 2)}</pre>
      </div>
    );
  }

  return <div>Something went wrong</div>;
}
```

## Common Patterns

### Reset to Initial State

```jsx
import React from 'react';
import { useGetData, isInit, isPending, isSuccess, isError } from '@intrig/react';

function ResettableDataLoader() {
  const [dataResponse, fetchData, resetData] = useGetData({
    fetchOnMount: false
  });

  const handleReset = () => {
    resetData(); // This will set the state back to 'init'
  };

  return (
    <div>
      {isInit(dataResponse) && (
        <div>
          <p>No data loaded yet</p>
          <button onClick={() => fetchData()}>Load Data</button>
        </div>
      )}

      {isPending(dataResponse) && <div>Loading...</div>}

      {isError(dataResponse) && (
        <div>
          <p>Error loading data</p>
          <button onClick={handleReset}>Reset</button>
        </div>
      )}

      {isSuccess(dataResponse) && (
        <div>
          <p>Data loaded successfully!</p>
          <button onClick={handleReset}>Reset</button>
        </div>
      )}
    </div>
  );
}
```

### Initial State with Form Validation

```jsx
import React, { useState } from 'react';
import { useSubmitForm, isInit, isPending, isSuccess } from '@intrig/react';

function ValidatedForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitResponse, submitForm] = useSubmitForm({ fetchOnMount: false });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      submitForm({ body: formData });
    }
  };

  if (isSuccess(submitResponse)) {
    return <div>Form submitted successfully!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {isInit(submitResponse) && (
        <div className="form-instructions">
          <p>Please fill out the form below and submit.</p>
        </div>
      )}

      <div>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="Email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Password"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <button type="submit" disabled={isPending(submitResponse)}>
        {isPending(submitResponse) ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Progressive Disclosure

```jsx
import React, { useState } from 'react';
import { useGetAdvancedData, isInit, isPending, isSuccess } from '@intrig/react';

function ProgressiveDisclosure() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedResponse, fetchAdvanced] = useGetAdvancedData({
    fetchOnMount: false
  });

  return (
    <div>
      <div className="basic-content">
        <h2>Basic Information</h2>
        <p>This is the basic content that's always visible.</p>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </button>

      {showAdvanced && (
        <div className="advanced-content">
          {isInit(advancedResponse) && (
            <div>
              <p>Advanced options are available.</p>
              <button onClick={() => fetchAdvanced()}>
                Load Advanced Data
              </button>
            </div>
          )}

          {isPending(advancedResponse) && (
            <div>Loading advanced data...</div>
          )}

          {isSuccess(advancedResponse) && (
            <div>
              <h3>Advanced Data</h3>
              <pre>{JSON.stringify(advancedResponse.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Type Safety Benefits

The `isInit` function provides several TypeScript benefits:

1. **Type Narrowing**: After the check, TypeScript knows you have an `InitState<T, E>`
2. **State Clarity**: Clearly identifies when no request has been made
3. **Compile-time Safety**: Prevents assumptions about data availability
4. **Flow Control**: Enables proper conditional rendering based on initialization state

## Related Functions

- [`isSuccess`](./is-success.md) - Check if a request succeeded
- [`isError`](./is-error.md) - Check if a request failed
- [`isPending`](./is-pending.md) - Check if a request is in progress
- [`NetworkState`](./network-state.md) - The base state interface

## Best Practices

1. **Show clear initial states**: Use `isInit` to display helpful messages or call-to-action buttons
2. **Avoid auto-fetching when appropriate**: Let users trigger requests manually for better control
3. **Provide context**: Explain what will happen when users trigger the initial request
4. **Handle reset scenarios**: Allow users to return to the initial state when needed
5. **Use for form states**: Great for forms that should be pristine until submitted
6. **Progressive disclosure**: Load data only when users explicitly request it

## Troubleshooting

### Common Issues

**Issue**: State never shows as init after component mount
```typescript
// ❌ Bad - fetchOnMount: true will skip init state
const [response] = useGetData({ fetchOnMount: true });

// ✅ Good - fetchOnMount: false preserves init state
const [response, fetchData] = useGetData({ fetchOnMount: false });
```

**Issue**: Cannot trigger request from init state
```typescript
// ❌ Bad - missing fetch function
const [response] = useGetData({ fetchOnMount: false });

// ✅ Good - destructure the fetch function
const [response, fetchData] = useGetData({ fetchOnMount: false });
if (isInit(response)) {
  // Now you can call fetchData()
}
```

**Issue**: Init state not properly reset
```typescript
// ✅ Use the reset function if available
const [response, fetchData, resetData] = useGetData({ fetchOnMount: false });

const handleReset = () => {
  resetData(); // This returns state to 'init'
};
```