/**
 * Error message formatting utilities.
 * Provides user-friendly error messages with actionable suggestions.
 */

import type { DiscoveryErrorCode } from '../types/discovery.js';
import type { DaemonClientErrorCode } from '../types/daemon-api.js';

type ErrorCode = DiscoveryErrorCode | DaemonClientErrorCode;

/**
 * Actionable suggestions for each error code.
 */
const ERROR_SUGGESTIONS: Record<ErrorCode, string> = {
  // Discovery errors
  PROJECT_NOT_FOUND:
    'Make sure you have initialized an Intrig project in this directory.\n' +
    'Run `intrig init` to create a new project, or check that the path is correct.',
  DAEMON_START_FAILED:
    'The Intrig daemon could not be started automatically.\n' +
    'Try running `intrig daemon up` manually in the project directory to see detailed error messages.',
  DAEMON_UNAVAILABLE:
    'The Intrig daemon is not responding.\n' +
    'Run `intrig daemon up` in the project directory to start it.',
  REGISTRY_ERROR:
    'Could not read the Intrig project registry.\n' +
    'This may be a permissions issue. Check that you have access to the temp directory.',

  // Daemon client errors
  RESOURCE_NOT_FOUND:
    'The requested resource was not found.\n' +
    'The ID may be invalid or the resource may have been removed. Try searching again to get current IDs.',
  REQUEST_TIMEOUT:
    'The request to the daemon timed out.\n' +
    'The daemon may be overloaded or unresponsive. Try again, or restart the daemon with `intrig daemon restart`.',
  INVALID_RESPONSE:
    'Received an unexpected response from the daemon.\n' +
    'This may indicate a version mismatch. Try updating Intrig: `npm update -g @intrig/core`',
};

/**
 * Format an error message with actionable suggestion.
 */
export function formatError(code: ErrorCode, message: string): string {
  const suggestion = ERROR_SUGGESTIONS[code];
  const lines = [`Error: ${message}`];

  if (suggestion) {
    lines.push('');
    lines.push(suggestion);
  }

  return lines.join('\n');
}

/**
 * Format a validation error message.
 */
export function formatValidationError(field: string, expected: string): string {
  return `Invalid input: "${field}" ${expected}`;
}

/**
 * Format an "empty state" message when no projects are found.
 */
export function formatNoProjectsMessage(): string {
  return (
    'No registered Intrig projects found.\n\n' +
    'To get started:\n' +
    '1. Navigate to your project directory\n' +
    '2. Run `intrig init` to initialize Intrig\n' +
    '3. Run `intrig daemon up` to start the daemon\n\n' +
    'The daemon will automatically register the project for the MCP server to discover.'
  );
}

/**
 * Format a message when sources are not yet synced.
 */
export function formatNoSourcesMessage(projectName: string): string {
  return (
    `Project "${projectName}" has no API sources configured.\n\n` +
    'Add API sources to your intrig.config.js file:\n' +
    '```\n' +
    'sources: [\n' +
    '  { id: "my-api", specUrl: "https://api.example.com/openapi.json" }\n' +
    ']\n' +
    '```\n\n' +
    'Then run `intrig sync` to fetch the API specifications.'
  );
}
