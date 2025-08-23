import { reactSseHookDocs } from './sse-hook';

// We use a plain object cast to any to avoid direct dependency on the types from "@intrig/plugin-sdk" in test.

describe('reactSseHookDocs', () => {
  it('snapshot — simple REST descriptor (no body, no path params)', async () => {
    const descriptor = {
      id: '1',
      name: 'streamLogs',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'logs',
      data: {
        method: 'GET',
        paths: ['/api/logs/stream'],
        operationId: 'streamLogs',
        // no requestBody
        // no variables
      },
    };

    const result = await reactSseHookDocs(descriptor as any);

    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body only (no path params)', async () => {
    const descriptor = {
      id: '2',
      name: 'streamCustomEvents',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'events',
      data: {
        method: 'POST',
        paths: ['/api/events/stream'],
        operationId: 'streamCustomEvents',
        requestBody: 'StreamCustomEventsRequest',
        // no variables
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — path params only (no request body)', async () => {
    const descriptor = {
      id: '3',
      name: 'streamUserActivity',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{userId}/activity',
      data: {
        method: 'GET',
        paths: ['/api/users/{userId}/activity/stream'],
        operationId: 'streamUserActivity',
        variables: [
          { name: 'userId', in: 'path', ref: '#/components/schemas/UserId' },
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body and path params', async () => {
    const descriptor = {
      id: '4',
      name: 'streamTaskProgress',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'tasks/{taskId}/progress',
      data: {
        method: 'POST',
        paths: ['/api/tasks/{taskId}/progress/stream'],
        operationId: 'streamTaskProgress',
        requestBody: 'StreamTaskProgressRequest',
        variables: [
          { name: 'taskId', in: 'PATH', ref: '#/components/schemas/TaskId' },
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles multiple path params', async () => {
    const descriptor = {
      id: '5',
      name: 'streamProjectNotifications',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'projects/{projectId}/notifications/{notificationId}',
      data: {
        method: 'GET',
        paths: ['/api/projects/{projectId}/notifications/{notificationId}/stream'],
        operationId: 'streamProjectNotifications',
        variables: [
          { name: 'projectId', in: 'path', ref: '#/components/schemas/ProjectId' },
          { name: 'notificationId', in: 'PATH', ref: '#/components/schemas/NotificationId' },
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles query params mixed with path params', async () => {
    const descriptor = {
      id: '6',
      name: 'streamSystemMetrics',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'systems/{systemId}/metrics',
      data: {
        method: 'GET',
        paths: ['/api/systems/{systemId}/metrics/stream'],
        operationId: 'streamSystemMetrics',
        variables: [
          { name: 'systemId', in: 'path', ref: '#/components/schemas/SystemId' },
          { name: 'interval', in: 'query', ref: '#/components/schemas/Interval' },
          { name: 'includeDetails', in: 'QUERY', ref: '#/components/schemas/Boolean' },
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles empty variables array', async () => {
    const descriptor = {
      id: '7',
      name: 'streamGlobalEvents',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'events',
      data: {
        method: 'GET',
        paths: ['/api/events/global/stream'],
        operationId: 'streamGlobalEvents',
        variables: [], // empty array instead of undefined
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles case-insensitive path parameter detection', async () => {
    const descriptor = {
      id: '8',
      name: 'streamOrderUpdates',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'orders/{orderId}',
      data: {
        method: 'GET',
        paths: ['/api/orders/{orderId}/updates/stream'],
        operationId: 'streamOrderUpdates',
        variables: [
          { name: 'orderId', in: 'Path', ref: '#/components/schemas/OrderId' }, // Mixed case
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles complex SSE endpoint with body and multiple params', async () => {
    const descriptor = {
      id: '9',
      name: 'streamAnalytics',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'analytics/{dashboardId}/stream',
      data: {
        method: 'POST',
        paths: ['/api/analytics/{dashboardId}/stream'],
        operationId: 'streamAnalytics',
        requestBody: 'StreamAnalyticsRequest',
        variables: [
          { name: 'dashboardId', in: 'path', ref: '#/components/schemas/DashboardId' },
          { name: 'real_time', in: 'query', ref: '#/components/schemas/Boolean' },
          { name: 'format', in: 'query', ref: '#/components/schemas/Format' },
        ],
      },
    };

    const result = await reactSseHookDocs(descriptor as any);
    expect(result.path).toBe('sse-hook.md');
    expect(result.content).toMatchSnapshot();
  });
});