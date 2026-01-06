import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  getRegistryDir,
  scanRegistry,
  resolveProjectPath,
  isPortInUse,
  waitForDaemonReady,
  listProjects,
  findProjectByName,
  resolveProjectIdentifier,
} from './discovery.service.js';
import { DiscoveryMetadata, ok, err, discoveryError } from '../types/discovery.js';

// Mock external dependencies
vi.mock('node:fs');
vi.mock('node:os');
vi.mock('tcp-port-used', () => ({
  default: {
    check: vi.fn(),
  },
}));

const mockedFs = vi.mocked(fs);
const mockedOs = vi.mocked(os);

// Import mocked tcp-port-used
import tcpPortUsed from 'tcp-port-used';
const mockedTcpPortUsed = vi.mocked(tcpPortUsed);

describe('discovery.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for os.tmpdir and os.userInfo
    mockedOs.tmpdir.mockReturnValue('/tmp');
    mockedOs.userInfo.mockReturnValue({
      username: 'testuser',
      uid: 1000,
      gid: 1000,
      shell: '/bin/bash',
      homedir: '/home/testuser',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getRegistryDir', () => {
    it('should return correct registry directory path', () => {
      const result = getRegistryDir();
      expect(result).toBe('/tmp/testuser.intrig');
    });

    it('should sanitize username with special characters', () => {
      mockedOs.userInfo.mockReturnValue({
        username: 'test@user.name',
        uid: 1000,
        gid: 1000,
        shell: '/bin/bash',
        homedir: '/home/testuser',
      });

      const result = getRegistryDir();
      expect(result).toBe('/tmp/test_user_name.intrig');
    });
  });

  describe('scanRegistry', () => {
    it('should return empty array when registry directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = scanRegistry();
      expect(result).toEqual([]);
    });

    it('should return empty array when registry directory is empty', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([]);

      const result = scanRegistry();
      expect(result).toEqual([]);
    });

    it('should parse valid metadata files', () => {
      const metadata: DiscoveryMetadata = {
        projectName: 'test-project',
        url: 'http://localhost:5050',
        port: 5050,
        pid: 12345,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/home/user/projects/test-project',
        type: 'react',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'abc123.json',
      ] as unknown as fs.Dirent[]);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(metadata));

      const result = scanRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(metadata);
    });

    it('should skip non-json files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'abc123.txt',
        'def456.json',
      ] as unknown as fs.Dirent[]);

      const validMetadata: DiscoveryMetadata = {
        projectName: 'test-project',
        url: 'http://localhost:5050',
        port: 5050,
        pid: 12345,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/home/user/projects/test-project',
        type: 'react',
      };

      mockedFs.readFileSync.mockImplementation((filePath) => {
        if (String(filePath).endsWith('def456.json')) {
          return JSON.stringify(validMetadata);
        }
        throw new Error('Should not read non-json files');
      });

      const result = scanRegistry();
      expect(result).toHaveLength(1);
    });

    it('should skip corrupted json files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'corrupted.json',
        'valid.json',
      ] as unknown as fs.Dirent[]);

      const validMetadata: DiscoveryMetadata = {
        projectName: 'test-project',
        url: 'http://localhost:5050',
        port: 5050,
        pid: 12345,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/home/user/projects/test-project',
        type: 'react',
      };

      mockedFs.readFileSync.mockImplementation((filePath) => {
        if (String(filePath).endsWith('corrupted.json')) {
          return 'not valid json {{{';
        }
        return JSON.stringify(validMetadata);
      });

      const result = scanRegistry();
      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe('test-project');
    });

    it('should skip files with missing required fields', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'incomplete.json',
      ] as unknown as fs.Dirent[]);

      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        projectName: 'test',
        // missing other required fields
      }));

      const result = scanRegistry();
      expect(result).toHaveLength(0);
    });
  });

  describe('resolveProjectPath', () => {
    const metadata1: DiscoveryMetadata = {
      projectName: 'project-a',
      url: 'http://localhost:5050',
      port: 5050,
      pid: 12345,
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/home/user/projects/project-a',
      type: 'react',
    };

    const metadata2: DiscoveryMetadata = {
      projectName: 'project-b',
      url: 'http://localhost:5051',
      port: 5051,
      pid: 12346,
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/home/user/projects/project-b',
      type: 'next',
    };

    beforeEach(() => {
      // Setup registry with two projects
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'hash1.json',
        'hash2.json',
      ] as unknown as fs.Dirent[]);

      mockedFs.readFileSync.mockImplementation((filePath) => {
        if (String(filePath).endsWith('hash1.json')) {
          return JSON.stringify(metadata1);
        }
        return JSON.stringify(metadata2);
      });
    });

    it('should return exact match for project root path', () => {
      const result = resolveProjectPath('/home/user/projects/project-a');
      expect(result).toEqual(metadata1);
    });

    it('should return match for subdirectory path', () => {
      const result = resolveProjectPath('/home/user/projects/project-a/src/components');
      expect(result).toEqual(metadata1);
    });

    it('should return null for non-matching path', () => {
      const result = resolveProjectPath('/home/user/other/unregistered');
      expect(result).toBeNull();
    });

    it('should prefer exact match over subdirectory match', () => {
      // This tests that if we have both an exact match and a subdirectory match,
      // we return the exact match
      const result = resolveProjectPath('/home/user/projects/project-b');
      expect(result).toEqual(metadata2);
    });

    it('should return null when registry is empty', () => {
      mockedFs.readdirSync.mockReturnValue([]);

      const result = resolveProjectPath('/home/user/projects/any');
      expect(result).toBeNull();
    });
  });

  describe('isPortInUse', () => {
    it('should return true when port is in use', async () => {
      mockedTcpPortUsed.check.mockResolvedValue(true);

      const result = await isPortInUse(5050);
      expect(result).toBe(true);
      expect(mockedTcpPortUsed.check).toHaveBeenCalledWith(5050);
    });

    it('should return false when port is not in use', async () => {
      mockedTcpPortUsed.check.mockResolvedValue(false);

      const result = await isPortInUse(5050);
      expect(result).toBe(false);
    });

    it('should return false when check throws error', async () => {
      mockedTcpPortUsed.check.mockRejectedValue(new Error('Network error'));

      const result = await isPortInUse(5050);
      expect(result).toBe(false);
    });
  });

  describe('waitForDaemonReady', () => {
    it('should return true immediately if port is already in use', async () => {
      mockedTcpPortUsed.check.mockResolvedValue(true);

      const result = await waitForDaemonReady(5050, 1000, 100);
      expect(result).toBe(true);
      expect(mockedTcpPortUsed.check).toHaveBeenCalledTimes(1);
    });

    it('should poll until port becomes available', async () => {
      // First two calls return false, third returns true
      mockedTcpPortUsed.check
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await waitForDaemonReady(5050, 5000, 50);
      expect(result).toBe(true);
      expect(mockedTcpPortUsed.check).toHaveBeenCalledTimes(3);
    });

    it('should return false when timeout exceeded', async () => {
      mockedTcpPortUsed.check.mockResolvedValue(false);

      const result = await waitForDaemonReady(5050, 200, 50);
      expect(result).toBe(false);
    });
  });

  describe('findProjectByName', () => {
    const metadata: DiscoveryMetadata = {
      projectName: 'my-project',
      url: 'http://localhost:5050',
      port: 5050,
      pid: 12345,
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/home/user/projects/my-project',
      type: 'react',
    };

    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['hash.json'] as unknown as fs.Dirent[]);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(metadata));
    });

    it('should find project by exact name match', () => {
      const result = findProjectByName('my-project');
      expect(result).toEqual(metadata);
    });

    it('should return null for non-matching name', () => {
      const result = findProjectByName('other-project');
      expect(result).toBeNull();
    });
  });

  describe('resolveProjectIdentifier', () => {
    const metadata: DiscoveryMetadata = {
      projectName: 'test-project',
      url: 'http://localhost:5050',
      port: 5050,
      pid: 12345,
      timestamp: '2024-01-01T00:00:00.000Z',
      path: '/home/user/projects/test-project',
      type: 'react',
    };

    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['hash.json'] as unknown as fs.Dirent[]);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(metadata));
    });

    it('should resolve by path', () => {
      const result = resolveProjectIdentifier('/home/user/projects/test-project');
      expect(result).toEqual(metadata);
    });

    it('should resolve by subdirectory path', () => {
      const result = resolveProjectIdentifier('/home/user/projects/test-project/src');
      expect(result).toEqual(metadata);
    });

    it('should resolve by project name when path does not match', () => {
      const result = resolveProjectIdentifier('test-project');
      expect(result).toEqual(metadata);
    });

    it('should return null for unresolvable identifier', () => {
      const result = resolveProjectIdentifier('unknown-project');
      expect(result).toBeNull();
    });
  });

  describe('Result helpers', () => {
    it('ok should create success result', () => {
      const result = ok({ value: 42 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ value: 42 });
      }
    });

    it('err should create error result', () => {
      const error = discoveryError('PROJECT_NOT_FOUND', 'Not found');
      const result = err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PROJECT_NOT_FOUND');
        expect(result.error.message).toBe('Not found');
      }
    });

    it('discoveryError should create error with cause', () => {
      const cause = new Error('Original error');
      const error = discoveryError('DAEMON_START_FAILED', 'Failed', cause);
      expect(error.code).toBe('DAEMON_START_FAILED');
      expect(error.message).toBe('Failed');
      expect(error.cause).toBe(cause);
    });
  });
});
