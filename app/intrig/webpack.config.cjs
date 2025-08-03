const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

class MakeExecutablePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('MakeExecutablePlugin', () => {
      const outDir = compiler.options.output.path;
      const file = path.join(outDir, 'main.js');
      try {
        fs.chmodSync(file, 0o755);
        console.log(`✔️ Made ${file} executable`);
      } catch (e) {
        console.warn(`⚠️ Could not chmod ${file}:`, e.message);
      }
    });
  }
}

// Helper function to create a dynamic import wrapper
const createDynamicImportWrapper = () => {
  return {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap('DynamicImportWrapper', compilation => {
        compilation.hooks.processAssets.tap(
          {
            name: 'DynamicImportWrapper',
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY,
          },
          assets => {
            // Find the main.js asset
            const mainAsset = assets['main.js'];
            if (!mainAsset) return;

            // Get the content as string
            let content = mainAsset.source().toString();

            // Replace all require statements with createRequire
            content = content.replace(
              /const\s+([a-zA-Z0-9_]+)_namespaceObject\s+=\s+require\(["']([^"']+)["']\);/g,
              (match, name, path) => {
                return `const ${name}_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("${path}");`;
              }
            );

            content = content.replace(`__WEBPACK_EXTERNAL_createRequire(import.meta.url)("nypm")`, `await import("nypm")`)

            // Update the asset
            compilation.updateAsset('main.js', new webpack.sources.RawSource(content));
          }
        );
      });
    }
  };
};

module.exports = {
  devtool: 'source-map',
  output: {
    path: join(__dirname, '../../dist/app/intrig'),
    module: true,
    chunkFormat: 'module',
    library: {
      type: 'module'
    },
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `#!/usr/bin/env node
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
      `,
      raw: true,
      entryOnly: true,
    }),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        { input: '../../', output: '.', glob: 'README.md' },
        { input: '../../dist/app/insight', output: './assets/insight', glob: '**/*' }
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
    new MakeExecutablePlugin(),
    createDynamicImportWrapper(),
  ],
};
