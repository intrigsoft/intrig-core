import { reactDownloadHookDocs } from './download-hook';

// We use a plain object cast to any to avoid direct dependency on the types from "@intrig/plugin-sdk" in test.

describe('reactDownloadHookDocs', () => {
  it('snapshot — simple REST descriptor (no body, no path params)', async () => {
    const descriptor = {
      id: '1',
      name: 'downloadReport',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'reports',
      data: {
        method: 'GET',
        paths: ['/api/reports/download'],
        operationId: 'downloadReport',
        // no requestBody
        // no variables
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);

    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body only (no path params)', async () => {
    const descriptor = {
      id: '2',
      name: 'downloadCustomReport',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'reports',
      data: {
        method: 'POST',
        paths: ['/api/reports/download-custom'],
        operationId: 'downloadCustomReport',
        requestBody: 'DownloadCustomReportRequest',
        // no variables
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — path params only (no request body)', async () => {
    const descriptor = {
      id: '3',
      name: 'downloadFileById',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'files/{id}',
      data: {
        method: 'GET',
        paths: ['/api/files/{id}/download'],
        operationId: 'downloadFileById',
        variables: [
          { name: 'id', in: 'path', ref: '#/components/schemas/Id' },
        ],
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('snapshot — request body and path params', async () => {
    const descriptor = {
      id: '4',
      name: 'downloadUserDocument',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'users/{userId}/documents',
      data: {
        method: 'POST',
        paths: ['/api/users/{userId}/documents/download'],
        operationId: 'downloadUserDocument',
        requestBody: 'DownloadUserDocumentRequest',
        variables: [
          { name: 'userId', in: 'PATH', ref: '#/components/schemas/UserId' },
        ],
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles multiple path params', async () => {
    const descriptor = {
      id: '5',
      name: 'downloadProjectAsset',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'projects/{projectId}/assets/{assetId}',
      data: {
        method: 'GET',
        paths: ['/api/projects/{projectId}/assets/{assetId}/download'],
        operationId: 'downloadProjectAsset',
        variables: [
          { name: 'projectId', in: 'path', ref: '#/components/schemas/ProjectId' },
          { name: 'assetId', in: 'PATH', ref: '#/components/schemas/AssetId' },
        ],
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles query params mixed with path params', async () => {
    const descriptor = {
      id: '6',
      name: 'downloadTaskFile',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'tasks/{taskId}/files',
      data: {
        method: 'GET',
        paths: ['/api/tasks/{taskId}/files/download'],
        operationId: 'downloadTaskFile',
        variables: [
          { name: 'taskId', in: 'path', ref: '#/components/schemas/TaskId' },
          { name: 'format', in: 'query', ref: '#/components/schemas/Format' },
          { name: 'includeMetadata', in: 'QUERY', ref: '#/components/schemas/Boolean' },
        ],
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles empty variables array', async () => {
    const descriptor = {
      id: '7',
      name: 'downloadBackup',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'backup',
      data: {
        method: 'GET',
        paths: ['/api/backup/download'],
        operationId: 'downloadBackup',
        variables: [], // empty array instead of undefined
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });

  it('handles case-insensitive path parameter detection', async () => {
    const descriptor = {
      id: '8',
      name: 'downloadInvoice',
      type: 'rest' as const,
      source: 'demo_api',
      path: 'invoices/{invoiceId}',
      data: {
        method: 'GET',
        paths: ['/api/invoices/{invoiceId}/download'],
        operationId: 'downloadInvoice',
        variables: [
          { name: 'invoiceId', in: 'Path', ref: '#/components/schemas/InvoiceId' }, // Mixed case
        ],
      },
    };

    const result = await reactDownloadHookDocs(descriptor as any);
    expect(result.path).toBe('download-hook.md');
    expect(result.content).toMatchSnapshot();
  });
});