import { GeneratorContext, typescript} from "@intrig/plugin-sdk";
import * as path from 'path';
import * as fsx from "fs-extra";

export function flushSyncUtilTemplate(ctx: GeneratorContext) {
  const ts = typescript(path.resolve('src', 'utils', 'flush-sync.ts'));

  const projectDir = ctx.rootDir ?? process.cwd();
  const packageJson = fsx.readJsonSync(path.resolve(projectDir, 'package.json'));
  
  // Check if react-dom is available at generation time
  const hasReactDom = !!(
    packageJson.dependencies?.['react-dom'] || 
    packageJson.devDependencies?.['react-dom'] ||
    packageJson.peerDependencies?.['react-dom']
  );
  
  if (hasReactDom) {
    // Generate DOM-compatible version
    return ts`/**
 * Platform-compatible flushSync utility
 * 
 * This utility provides flushSync functionality for React DOM environments.
 * Uses the native flushSync from react-dom for synchronous updates.
 */

import { flushSync as reactDomFlushSync } from 'react-dom';

/**
 * Cross-platform flushSync implementation
 * 
 * Forces React to flush any pending updates synchronously.
 * Uses react-dom's native flushSync implementation.
 * 
 * @param callback - The callback to execute synchronously
 */
export const flushSync = reactDomFlushSync;

/**
 * Check if we're running in a DOM environment
 * Always true when react-dom is available
 */
export const isDOMEnvironment = true;
`;
  } else {
    // Generate React Native/non-DOM version
    return ts`/**
 * Platform-compatible flushSync utility
 * 
 * This utility provides flushSync functionality for React Native and other non-DOM environments.
 * In React Native, we don't have the same concurrent rendering concerns,
 * so we execute the callback immediately.
 */

/**
 * Cross-platform flushSync implementation
 * 
 * Forces React to flush any pending updates synchronously.
 * In React Native, executes the callback immediately.
 * 
 * @param callback - The callback to execute synchronously
 */
export const flushSync = (callback: () => void) => {
  callback();
};

/**
 * Check if we're running in a DOM environment
 * Always false when react-dom is not available
 */
export const isDOMEnvironment = false;
`;
  }
}