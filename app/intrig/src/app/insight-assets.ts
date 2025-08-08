// Import insight assets using webpack's require.context
// These will be bundled into main.js

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Function to load assets at runtime
export function loadInsightAssets() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // In production, the assets are in the dist directory
  // The path structure is different between development and production
  let insightDistPath;
  
  // Try the dist path first (production)
  insightDistPath = path.resolve(__dirname, '..', 'assets', 'insight');
  
  // If that doesn't exist, try the development path
  if (!fs.existsSync(insightDistPath)) {
    insightDistPath = path.resolve(process.cwd(), 'dist', 'app', 'intrig', 'assets', 'insight');
  }
  
  // Check if the assets directory exists
  if (!fs.existsSync(insightDistPath)) {
    throw new Error(`Insight assets directory not found at ${insightDistPath}`);
  }
  
  // Load the assets
  const html = fs.readFileSync(path.join(insightDistPath, 'index.html'), 'utf8');
  
  // Find the CSS and JS files in the assets directory
  const assetsDir = path.join(insightDistPath, 'assets');
  const files = fs.readdirSync(assetsDir);
  
  const cssFile = files.find(file => file.endsWith('.css'));
  const jsFile = files.find(file => file.endsWith('.js'));
  
  if (!cssFile || !jsFile) {
    throw new Error('CSS or JS file not found in insight assets directory');
  }
  
  const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
  const js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
  
  // Load favicon and package.json
  const favicon = fs.readFileSync(path.join(insightDistPath, 'favicon.ico'));
  const packageJson = fs.readFileSync(path.join(insightDistPath, 'package.json'), 'utf8');
  
  return {
    html,
    css,
    js,
    favicon,
    packageJson: JSON.parse(packageJson)
  };
}