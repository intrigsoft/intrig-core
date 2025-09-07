import * as fs from 'fs';
import * as path from 'path';
import type { AddSourceContext } from '@intrig/plugin-sdk';

export interface NextPluginOptions {
  apiRoutesDir?: string;
}

export async function addSource(ctx: AddSourceContext<NextPluginOptions>): Promise<void> {
  const { rootDir, source, serverUrl } = ctx;
  const envPath = path.resolve(rootDir, '.env');
  
  // Generate environment variable name from source ID
  const envVarName = `${source.id.toUpperCase()}_API_URL`;
  // Use serverUrl if available, otherwise fall back to specUrl
  const apiUrl = serverUrl || source.specUrl;
  const envVarLine = `${envVarName}=${apiUrl}`;
  
  let envContent = '';
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  // Check if the environment variable already exists
  const lines = envContent.split('\n');
  const existingLineIndex = lines.findIndex(line => 
    line.trim().startsWith(`${envVarName}=`)
  );
  
  if (existingLineIndex >= 0) {
    // Update existing line
    lines[existingLineIndex] = envVarLine;
  } else {
    // Add new line
    if (envContent && !envContent.endsWith('\n')) {
      lines.push('');
    }
    lines.push(envVarLine);
  }
  
  // Write back to .env file
  const newContent = lines.join('\n');
  fs.writeFileSync(envPath, newContent, 'utf-8');
  
  console.log(`Added environment variable ${envVarName} to .env file`);
}