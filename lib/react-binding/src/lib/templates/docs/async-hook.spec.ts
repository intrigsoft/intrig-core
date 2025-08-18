import { reactAsyncFunctionHookDocs } from './async-hook';

// We use a plain object cast to any to avoid direct dependency on the types from 'common' in test.

describe('reactAsyncFunctionHookDocs', () => {
  it('snapshot — simple REST descriptor (no body, no path params)', async () => {
    const descriptor = {
      id: '1',
      name: 'validateUsername',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users',
      data: {
        method: 'GET',
        paths: ['/api/users/validate-username'],
        operationId: 'validateUsername',
        // no requestBody
        // no variables
      },
    };

    const result = await reactAsyncFunctionHookDocs(descriptor as any);

    expect(result.path).toBe('async-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body only (no path params)', async () => {
    const descriptor = {
      id: '2',
      name: 'checkPasswordStrength',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'security',
      data: {
        method: 'POST',
        paths: ['/api/security/check-password'],
        operationId: 'checkPasswordStrength',
        requestBody: 'CheckPasswordStrengthRequest',
      },
    };

    const result = await reactAsyncFunctionHookDocs(descriptor as any);
    expect(result.path).toBe('async-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — path params only (no request body)', async () => {
    const descriptor = {
      id: '3',
      name: 'verifyUserById',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{id}',
      data: {
        method: 'GET',
        paths: ['/api/users/{id}/verify'],
        operationId: 'verifyUserById',
        variables: [
          { name: 'id', in: 'path', ref: '#/components/schemas/Id' },
        ],
      },
    };

    const result = await reactAsyncFunctionHookDocs(descriptor as any);
    expect(result.path).toBe('async-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body and path params', async () => {
    const descriptor = {
      id: '4',
      name: 'recalculateUserScore',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{id}',
      data: {
        method: 'PUT',
        paths: ['/api/users/{id}/score'],
        operationId: 'recalculateUserScore',
        requestBody: 'RecalculateUserScoreRequest',
        variables: [
          { name: 'id', in: 'PATH', ref: '#/components/schemas/Id' },
        ],
      },
    };

    const result = await reactAsyncFunctionHookDocs(descriptor as any);
    expect(result.path).toBe('async-hook.md');
    expect(result.content).toMatchSnapshot();
  });
});
