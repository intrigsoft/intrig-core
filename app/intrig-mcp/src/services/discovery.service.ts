import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import tcpPortUsed from 'tcp-port-used';
import {
  DiscoveryMetadata,
  ProjectInfo,
  Result,
  ok,
  err,
  discoveryError,
  DiscoveryError,
} from '../types/discovery.js';

/**
 * Get the registry directory path for the current user.
 * Format: {os.tmpdir()}/{username}.intrig/
 */
export function getRegistryDir(): string {
  const baseDir = os.tmpdir();
  const username = sanitizeName(os.userInfo().username);
  return path.join(baseDir, `${username}.intrig`);
}

/**
 * Sanitize a name by replacing non-alphanumeric characters with underscores.
 */
function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\-_]/g, '_');
}

/**
 * Check if a port is in use via TCP probe.
 */
export async function isPortInUse(port: number): Promise<boolean> {
  try {
    return await tcpPortUsed.check(port);
  } catch {
    return false;
  }
}

/**
 * Parse a metadata file safely.
 * Returns null for corrupted or missing files.
 */
function parseMetadataFile(filePath: string): DiscoveryMetadata | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as unknown;

    // Validate required fields
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as DiscoveryMetadata).projectName !== 'string' ||
      typeof (parsed as DiscoveryMetadata).url !== 'string' ||
      typeof (parsed as DiscoveryMetadata).port !== 'number' ||
      typeof (parsed as DiscoveryMetadata).pid !== 'number' ||
      typeof (parsed as DiscoveryMetadata).timestamp !== 'string' ||
      typeof (parsed as DiscoveryMetadata).path !== 'string' ||
      typeof (parsed as DiscoveryMetadata).type !== 'string'
    ) {
      return null;
    }

    return parsed as DiscoveryMetadata;
  } catch {
    return null;
  }
}

/**
 * Scan the registry directory for all registered projects.
 * Returns an array of DiscoveryMetadata for valid JSON files.
 * Skips corrupted or invalid files silently.
 */
export function scanRegistry(): DiscoveryMetadata[] {
  const registryDir = getRegistryDir();

  if (!fs.existsSync(registryDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(registryDir);
    const metadata: DiscoveryMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(registryDir, file);
      const parsed = parseMetadataFile(filePath);

      if (parsed !== null) {
        metadata.push(parsed);
      }
    }

    return metadata;
  } catch {
    return [];
  }
}

/**
 * Check if a daemon is running by probing its port.
 */
export async function isDaemonRunning(metadata: DiscoveryMetadata): Promise<boolean> {
  return isPortInUse(metadata.port);
}

/**
 * List all registered projects with their running status.
 */
export async function listProjects(): Promise<ProjectInfo[]> {
  const allMetadata = scanRegistry();
  const projects: ProjectInfo[] = [];

  for (const metadata of allMetadata) {
    const running = await isDaemonRunning(metadata);
    projects.push({
      projectName: metadata.projectName,
      path: metadata.path,
      url: metadata.url,
      port: metadata.port,
      type: metadata.type,
      running,
      metadata,
    });
  }

  return projects;
}

/**
 * Wait for a daemon to be ready by polling its port.
 * @param port The port to poll
 * @param maxWaitMs Maximum time to wait in milliseconds (default: 10000)
 * @param pollIntervalMs Polling interval in milliseconds (default: 500)
 */
export async function waitForDaemonReady(
  port: number,
  maxWaitMs = 10000,
  pollIntervalMs = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await isPortInUse(port)) {
      return true;
    }
    await sleep(pollIntervalMs);
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start a daemon for a project by spawning `intrig daemon up`.
 * Returns a Result indicating success or failure.
 */
export async function startDaemon(
  projectPath: string
): Promise<Result<void, DiscoveryError>> {
  return new Promise((resolve) => {
    const child = spawn('intrig', ['daemon', 'up'], {
      cwd: projectPath,
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', (error) => {
      resolve(
        err(
          discoveryError(
            'DAEMON_START_FAILED',
            `Failed to start daemon: ${error.message}`,
            error
          )
        )
      );
    });

    // Don't wait for the child process - it runs as a background daemon
    child.unref();

    // Give a short delay for the spawn to complete
    setTimeout(() => {
      resolve(ok(undefined));
    }, 500);
  });
}

/**
 * Resolve a path to its matching project.
 * Checks if the input path equals or is a subdirectory of any registered project.
 * Prefers exact matches over subdirectory matches.
 */
export function resolveProjectPath(inputPath: string): DiscoveryMetadata | null {
  const normalizedInput = path.resolve(inputPath);
  const allMetadata = scanRegistry();

  // First, look for exact match
  for (const metadata of allMetadata) {
    const normalizedProject = path.resolve(metadata.path);
    if (normalizedInput === normalizedProject) {
      return metadata;
    }
  }

  // Then, look for subdirectory match (input is inside project)
  let bestMatch: DiscoveryMetadata | null = null;
  let bestMatchLength = 0;

  for (const metadata of allMetadata) {
    const normalizedProject = path.resolve(metadata.path);

    // Check if input path starts with project path + separator
    if (
      normalizedInput.startsWith(normalizedProject + path.sep) ||
      normalizedInput.startsWith(normalizedProject + '/')
    ) {
      // Prefer longer project paths (more specific matches)
      if (normalizedProject.length > bestMatchLength) {
        bestMatch = metadata;
        bestMatchLength = normalizedProject.length;
      }
    }
  }

  return bestMatch;
}

/**
 * Get a project by path, ensuring the daemon is running.
 * Auto-starts the daemon if not running and waits for it to be ready.
 */
export async function getProject(
  inputPath: string
): Promise<Result<ProjectInfo, DiscoveryError>> {
  const metadata = resolveProjectPath(inputPath);

  if (metadata === null) {
    return err(
      discoveryError(
        'PROJECT_NOT_FOUND',
        `No registered Intrig project found for path: ${inputPath}`
      )
    );
  }

  const running = await isDaemonRunning(metadata);

  if (running) {
    return ok({
      projectName: metadata.projectName,
      path: metadata.path,
      url: metadata.url,
      port: metadata.port,
      type: metadata.type,
      running: true,
      metadata,
    });
  }

  // Auto-start the daemon
  const startResult = await startDaemon(metadata.path);
  if (!startResult.ok) {
    return startResult;
  }

  // Wait for daemon to be ready
  const ready = await waitForDaemonReady(metadata.port);

  if (!ready) {
    return err(
      discoveryError(
        'DAEMON_START_FAILED',
        `Daemon started but did not become ready within timeout for project: ${metadata.projectName}`
      )
    );
  }

  return ok({
    projectName: metadata.projectName,
    path: metadata.path,
    url: metadata.url,
    port: metadata.port,
    type: metadata.type,
    running: true,
    metadata,
  });
}

/**
 * Find a project by name (exact match on projectName).
 */
export function findProjectByName(projectName: string): DiscoveryMetadata | null {
  const allMetadata = scanRegistry();
  return allMetadata.find((m) => m.projectName === projectName) ?? null;
}

/**
 * Resolve a project identifier (path or project name) to metadata.
 */
export function resolveProjectIdentifier(identifier: string): DiscoveryMetadata | null {
  // First, try resolving as path
  const byPath = resolveProjectPath(identifier);
  if (byPath !== null) {
    return byPath;
  }

  // Then, try resolving as project name
  return findProjectByName(identifier);
}

/**
 * Get a project by identifier (path or project name), ensuring daemon is running.
 */
export async function getProjectByIdentifier(
  identifier: string
): Promise<Result<ProjectInfo, DiscoveryError>> {
  const metadata = resolveProjectIdentifier(identifier);

  if (metadata === null) {
    return err(
      discoveryError(
        'PROJECT_NOT_FOUND',
        `No registered Intrig project found for: ${identifier}`
      )
    );
  }

  // Use the resolved path to get the project
  return getProject(metadata.path);
}
