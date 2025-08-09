// Import insight assets using webpack's require.context
// These will be bundled into main.js

// import * as fs from 'fs';
// import * as path from 'path';
// import { fileURLToPath } from 'url';

import html from '!!raw-loader!../../../../dist/app/insight/index.html?raw';
import css  from '!!raw-loader!../../../../dist/app/insight/assets/index.css?raw';
import js   from '!!raw-loader!../../../../dist/app/insight/assets/index.js?raw';
import ico  from '../../../../dist/app/insight/favicon.ico';

// Function to load assets at runtime
export function loadInsightAssets() {
  return {
    html,
    css,
    js,
    favicon: ico,
    // packageJson: JSON.parse(packageJson)
  };
}