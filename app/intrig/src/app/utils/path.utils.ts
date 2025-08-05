import * as path from 'path';
import * as fs from 'fs';

/**
 * Utility functions for working with file paths
 * 
 * These utilities help resolve the issue where rootDir only gives the path of the working directory,
 * but we sometimes need to access the library's main file directory regardless of where the command
 * is executed from.
 * 
 * Usage examples:
 * 
 * 1. Get the working directory (same as rootDir from ConfigService):
 *    const workingDir = getWorkingDir();
 * 
 * 2. Get the library's main directory (finds the directory containing package.json):
 *    const libraryDir = getLibraryDir();
 * 
 * 3. Get a path relative to the library's main directory:
 *    const insightBuildDir = getLibraryPath('app/insight/dist');
 */

/**
 * Gets the working directory (same as rootDir from ConfigService)
 * This is equivalent to what ConfigService.get('rootDir') returns
 * 
 * @returns The current working directory
 */
export function getWorkingDir(): string {
  return process.cwd();
}

/**
 * Gets the library's main directory by traversing up from the current file
 * until it finds the package.json file.
 * 
 * This solves the issue where rootDir only gives the working directory,
 * but we need to access files relative to the library's main directory
 * regardless of where the command is executed from.
 * 
 * @returns The path to the library's main directory
 */
export function getLibraryDir(): string {
  // Start from the current file's directory
  let currentDir = __dirname;
  
  // Traverse up until we find package.json or hit the root
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }
    
    // Move up one directory
    currentDir = path.dirname(currentDir);
  }
  
  // If we couldn't find it, fall back to the working directory
  return getWorkingDir();
}

/**
 * Gets the absolute path to a file or directory relative to the library's main directory
 * 
 * This is a convenience function that combines getLibraryDir() with path.join()
 * 
 * @param relativePath The path relative to the library's main directory
 * @returns The absolute path
 * 
 * @example
 * // Get the path to the Insight build directory
 * const insightBuildDir = getLibraryPath('app/insight/dist');
 * 
 * @example
 * // Get the path to the Intrig assets directory
 * const intrigAssetsDir = getLibraryPath('app/intrig/src/assets/insight');
 */
export function getLibraryPath(relativePath: string): string {
  return path.join(getLibraryDir(), relativePath);
}