import { Controller, Get } from '@nestjs/common';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as process from 'process';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Controller('debug')
export class DebugController {
  @Get('dirname')
  getDirname() {
    // Calculate paths that might be relevant for debugging
    const assetsPath = join(process.cwd(), 'dist', 'app', 'intrig', 'assets', 'insight');
    const appDirname = dirname(__dirname);
    
    return {
      // ES Module specific values
      dirname: __dirname,
      filename: __filename,
      meta_url: import.meta.url,
      
      // Calculated paths
      assetsPath,
      appDirname,
      
      // Process information
      cwd: process.cwd(),
      execPath: process.execPath,
      
      // Environment
      nodeEnv: process.env.NODE_ENV,
      
      // Module type
      isESM: typeof require === 'undefined',
      
      // Timestamp for cache busting
      timestamp: new Date().toISOString()
    };
  }
}