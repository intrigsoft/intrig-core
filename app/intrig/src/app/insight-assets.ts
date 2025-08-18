// Import insight assets using webpack's require.context
// These will be bundled into main.js

// import * as fs from 'fs';
// import * as path from 'path';
// import { fileURLToPath } from 'url';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import html from '!!raw-loader!../../../../dist/app/insight/index.html?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import css  from '!!raw-loader!../../../../dist/app/insight/assets/index.css?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import js   from '!!raw-loader!../../../../dist/app/insight/assets/index.js?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line @nx/enforce-module-boundaries
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