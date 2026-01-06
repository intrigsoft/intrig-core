/**
 * Metadata written by daemon when registering itself.
 * Stored in {os.tmpdir()}/{username}.intrig/{sha1(projectPath)}.json
 */
export interface DiscoveryMetadata {
  projectName: string;    // From package.json name, sanitized
  url: string;            // e.g., "http://localhost:5050"
  port: number;           // e.g., 5050
  pid: number;            // Process ID
  timestamp: string;      // ISO date when registered
  path: string;           // Absolute path to project root
  type: string;           // Generator type (react, next, etc.)
}

/**
 * Project info with resolved running status.
 */
export interface ProjectInfo {
  projectName: string;
  path: string;
  url: string;
  port: number;
  type: string;
  running: boolean;
  metadata: DiscoveryMetadata;
}

/**
 * Error codes for discovery operations.
 */
export type DiscoveryErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'DAEMON_START_FAILED'
  | 'DAEMON_UNAVAILABLE'
  | 'REGISTRY_ERROR';

/**
 * Explicit error type for discovery operations.
 */
export interface DiscoveryError {
  code: DiscoveryErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Result type for operations that can fail with expected errors.
 * Using discriminated union for type-safe error handling.
 */
export type Result<T, E = DiscoveryError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper to create success result.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Helper to create error result.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Create a discovery error with code and message.
 */
export function discoveryError(
  code: DiscoveryErrorCode,
  message: string,
  cause?: unknown
): DiscoveryError {
  return { code, message, cause };
}
