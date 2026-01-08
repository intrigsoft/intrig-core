const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');
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

// Plugin to create minimal package.json with only truly external dependencies
class CreateMinimalPackageJsonPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('CreateMinimalPackageJsonPlugin', () => {
      const outDir = compiler.options.output.path;
      const sourcePkgPath = path.join(__dirname, 'package.json');
      const destPkgPath = path.join(outDir, 'package.json');

      try {
        const sourcePkg = JSON.parse(fs.readFileSync(sourcePkgPath, 'utf8'));

        // Create minimal package.json - only ESM-only modules that must be dynamic imports
        // These are the only true runtime dependencies
        const minimalPkg = {
          name: '@intrig/core',
          version: sourcePkg.version,
          private: false,
          type: 'module',
          bin: {
            intrig: './main.js',
          },
          publishConfig: {
            access: 'public',
          },
          // Only include dependencies that MUST be external (ESM-only dynamic imports)
          dependencies: {
            lowdb: '^7.0.0',
            nypm: '^0.6.0',
            open: '^10.0.0',
          },
        };

        fs.writeFileSync(destPkgPath, JSON.stringify(minimalPkg, null, 2));
        console.log(`✔️ Created minimal package.json with ${Object.keys(minimalPkg.dependencies).length} dependencies`);
      } catch (e) {
        console.warn(`⚠️ Could not create package.json:`, e.message);
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

            // Handle lowdb as a dynamic import
            content = content.replace(
              /__WEBPACK_EXTERNAL_createRequire\(import\.meta\.url\)\("lowdb"\)/g,
              `await import("lowdb")`
            );
            content = content.replace(
              /__WEBPACK_EXTERNAL_createRequire\(import\.meta\.url\)\("lowdb\/node"\)/g,
              `await import("lowdb/node")`
            );

            content = content.replace(`__WEBPACK_EXTERNAL_createRequire(import.meta.url)("nypm")`, `await import("nypm")`)
            content = content.replace(`__WEBPACK_EXTERNAL_createRequire(import.meta.url)("open")`, `await import("open")`)
            content = content.replaceAll(`external_open_default()(`, `external_open_default().default(`)

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
  externalsType: 'module',
  module: {
    rules: [
      { resourceQuery: /raw/, type: 'asset/source' },
      { resourceQuery: /(asset|inline)/, type: 'asset/inline' },
      {
        test: /\.(js|css|html)$/,
        include: resolve(__dirname, '../../dist/app/insight'),
        type: 'asset/source'
      },
      {
        test: /\.(png|jpe?g|svg|ico)$/,
        include: resolve(__dirname, '../../dist/app/insight'),
        type: 'asset/inline'
      }
    ]
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
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,  // We'll create our own minimal package.json
      sourceMap: true,
      // List specific modules to externalize - @intrig/plugin-sdk will be bundled
      externalDependencies: [
        // Optional NestJS modules that aren't installed
        '@nestjs/websockets',
        '@nestjs/websockets/socket-module',
        '@nestjs/microservices',
        '@nestjs/microservices/microservices-module',
        // Class-transformer optional import
        'class-transformer/storage',
        // ESM-only modules that need to be externalized
        'lowdb',
        'lowdb/node',
        'nypm',
        'open',
        // Old RxJS that has bundling issues
        'rx',
        'rx.binding',
        'rx.virtualtime',
      ],
    }),
    new MakeExecutablePlugin(),
    new CreateMinimalPackageJsonPlugin(),
    createDynamicImportWrapper(),
  ],
};
