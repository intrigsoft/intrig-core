/**
 * Debug logging utility for intrig-mcp.
 * Logs to stderr to avoid interfering with MCP protocol on stdout.
 *
 * Enable debug logging by setting the environment variable:
 *   DEBUG=intrig-mcp
 *
 * Or for more verbose output:
 *   DEBUG=intrig-mcp:*
 */

const DEBUG_ENV = process.env.DEBUG ?? '';
const isDebugEnabled =
  DEBUG_ENV === 'intrig-mcp' ||
  DEBUG_ENV === 'intrig-mcp:*' ||
  DEBUG_ENV.includes('intrig-mcp');

/**
 * Log a debug message to stderr.
 * Only outputs when DEBUG=intrig-mcp is set.
 */
export function debug(message: string, ...args: unknown[]): void {
  if (!isDebugEnabled) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[intrig-mcp ${timestamp}]`;

  if (args.length > 0) {
    console.error(prefix, message, ...args);
  } else {
    console.error(prefix, message);
  }
}

/**
 * Log an error message to stderr.
 * Always outputs regardless of debug setting.
 */
export function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[intrig-mcp ${timestamp}] ERROR:`;

  if (error instanceof Error) {
    console.error(prefix, message, error.message);
    if (isDebugEnabled && error.stack) {
      console.error(error.stack);
    }
  } else if (error !== undefined) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

/**
 * Create a namespaced debug logger.
 */
export function createDebugger(namespace: string): (message: string, ...args: unknown[]) => void {
  const fullNamespace = `intrig-mcp:${namespace}`;
  const isEnabled =
    DEBUG_ENV === 'intrig-mcp:*' ||
    DEBUG_ENV.includes(fullNamespace) ||
    isDebugEnabled;

  return (message: string, ...args: unknown[]): void => {
    if (!isEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${fullNamespace} ${timestamp}]`;

    if (args.length > 0) {
      console.error(prefix, message, ...args);
    } else {
      console.error(prefix, message);
    }
  };
}
