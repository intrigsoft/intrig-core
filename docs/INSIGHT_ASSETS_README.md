# Insight Assets Loading

This document explains how the Insight assets are loaded in the Intrig application.

## Overview

The Intrig application serves Insight frontend assets through an Express server. These assets include:

- HTML files
- CSS files
- JavaScript files
- Favicon
- Package.json

## Implementation Details

### Asset Loading Approach

The assets are loaded at runtime from the `assets/insight` directory. This approach has the following advantages:

1. It's more flexible and can handle file name changes (e.g., when the build process generates files with hash suffixes)
2. It doesn't require rebuilding the application when only the frontend assets change
3. It maintains compatibility with the existing build process

### Key Files

- **insight-assets.ts**: Contains the `loadInsightAssets()` function that dynamically loads the assets at runtime
- **insight.command.ts**: Uses the loaded assets to serve them through an Express server

### Build Process

The build process copies the Insight assets to the `assets/insight` directory in the output. This is configured in the `webpack.config.cjs` file:

```javascript
assets: [
  './src/assets',
  { input: '../../', output: '.', glob: 'README.md' },
  { input: '../../dist/app/insight', output: './assets/insight', glob: '**/*' }
],
```

## Usage

To start the Insight server, run:

```bash
intrig insight
```

This will:
1. Load the Insight assets from the `assets/insight` directory
2. Start an Express server on port 4300
3. Serve the assets through the server

## Development Workflow

When making changes to the Insight frontend:

1. Make your changes to the Insight frontend code
2. Build the Insight frontend
3. The build process will automatically copy the updated assets to the correct location
4. Restart the Intrig application to apply your changes

## Notes

- The `--path` option for the `insight` command is now deprecated as assets are loaded from a fixed location
- If you encounter any issues with asset loading, check the logs for error messages