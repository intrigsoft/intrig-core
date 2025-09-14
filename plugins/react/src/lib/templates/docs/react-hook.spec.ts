import { reactHookDocs } from './react-hook';

// The descriptor type is imported in the implementation from "@intrig/plugin-sdk".
// For the test we can just use the plain object shape to avoid tight coupling.

describe('reactHookDocs', () => {
  it('generates markdown that matches snapshot for a simple REST descriptor (no body, no path params)', async () => {
    const descriptor = {
      id: '1',
      name: 'getUser',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users',
      data: {
        method: 'GET',
        paths: ['/api/users'],
        operationId: 'getUser',
        // no requestBody
        // no variables
      },
    };

    const result = await reactHookDocs(descriptor as any);

    expect(result.path).toBe('react-hook.md');

    const md = result.content;

    expect(md).toMatchSnapshot();
  });

  it('snapshot — request body only (no path params)', async () => {
    const descriptor = {
      id: '2',
      name: 'createUser',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users',
      data: {
        method: 'POST',
        paths: ['/api/users'],
        operationId: 'createUser',
        requestBody: 'CreateUserRequest',
        // no variables
      },
    };

    const result = await reactHookDocs(descriptor as any);
    expect(result.path).toBe('react-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — path params only (no request body)', async () => {
    const descriptor = {
      id: '3',
      name: 'getUserById',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{id}',
      data: {
        method: 'GET',
        paths: ['/api/users/{id}'],
        operationId: 'getUserById',
        variables: [
          { name: 'id', in: 'path', ref: '#/components/schemas/Id' },
        ],
      },
    };

    const result = await reactHookDocs(descriptor as any);
    expect(result.path).toBe('react-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body and path params', async () => {
    const descriptor = {
      id: '4',
      name: 'updateUser',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{id}',
      data: {
        method: 'PUT',
        paths: ['/api/users/{id}'],
        operationId: 'updateUser',
        requestBody: 'UpdateUserRequest',
        variables: [
          { name: 'id', in: 'PATH', ref: '#/components/schemas/Id' },
        ],
      },
    };

    const result = await reactHookDocs(descriptor as any);
    expect(result.path).toBe('react-hook.md');
    expect(result.content).toMatchSnapshot();
  });
});
