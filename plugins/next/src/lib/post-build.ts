import {PostBuildContext} from '@intrig/plugin-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as fsx from 'fs-extra';

export interface NextPluginOptions {
  apiRoutesDir?: string;
}

export async function postBuild(ctx: PostBuildContext<NextPluginOptions>): Promise<void> {
  const { rootDir, options } = ctx;
  
  // Determine the target API routes directory
  const targetDir = options.apiRoutesDir 
    ? path.resolve(rootDir, options.apiRoutesDir)
    : path.resolve(rootDir, 'src/app/api');
  
  // Source directory where generated API files are located
  const sourceDir = path.resolve(rootDir, '.intrig/generated/src/api');
  
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Source directory does not exist: ${sourceDir}`);
    return;
  }
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  try {
    // Copy all files from source to target directory
    await fsx.copy(sourceDir, targetDir, {
      overwrite: true
    });
    
    console.log(`Successfully copied API files from ${sourceDir} to ${targetDir}`);
  } catch (error) {
    console.error(`Error copying API files: ${error}`);
    throw error;
  }
}