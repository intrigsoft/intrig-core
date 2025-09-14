import * as fs from 'fs';
import * as path from 'path';
import type { RemoveSourceContext } from '@intrig/plugin-sdk';

export interface NextPluginOptions {
  apiRoutesDir?: string;
}

export async function removeSource(ctx: RemoveSourceContext<NextPluginOptions>): Promise<void> {
  const { rootDir, source } = ctx;
  const envPath = path.resolve(rootDir, '.env');
  
  // Generate environment variable name from source ID
  const envVarName = `${source.id.toUpperCase()}_API_URL`;
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log(`No .env file found at ${envPath}`);
    return;
  }
  
  // Read existing .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  // Filter out the environment variable line
  const filteredLines = lines.filter(line => 
    !line.trim().startsWith(`${envVarName}=`)
  );
  
  // Check if anything was removed
  if (filteredLines.length === lines.length) {
    console.log(`Environment variable ${envVarName} not found in .env file`);
    return;
  }
  
  // Write back to .env file
  const newContent = filteredLines.join('\n');
  fs.writeFileSync(envPath, newContent, 'utf-8');
  
  console.log(`Removed environment variable ${envVarName} from .env file`);
}