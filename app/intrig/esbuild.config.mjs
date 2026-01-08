import * as esbuild from 'esbuild';
import * as swc from '@swc/core';
import { readFileSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
const outDir = join(rootDir, 'dist/app/intrig');

// SWC plugin to transform TypeScript with decorator metadata support
// Only transforms files that need decorator metadata (files with decorators)
const swcPlugin = {
  name: 'swc-transform',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      // Skip node_modules - they're already compiled
      if (args.path.includes('node_modules')) {
        return null;
      }

      const source = readFileSync(args.path, 'utf8');

      // Only use SWC for files that have decorators
      // This avoids issues with type-only exports in library files
      const hasDecorators = /@\w+\s*\(/.test(source);
      if (!hasDecorators) {
        return null; // Let esbuild handle files without decorators
      }

      try {
        const result = await swc.transform(source, {
          filename: args.path,
          jsc: {
            parser: {
              syntax: 'typescript',
              decorators: true,
            },
            transform: {
              legacyDecorator: true,
              decoratorMetadata: true,
              useDefineForClassFields: false,
            },
            target: 'es2022',
            keepClassNames: true,
          },
          module: {
            type: 'es6',
          },
          sourceMaps: true,
        });

        return {
          contents: result.code,
          loader: 'js',
        };
      } catch (err) {
        return {
          errors: [{ text: `SWC transform error: ${err.message}`, location: { file: args.path } }],
        };
      }
    });
  },
};

// Plugin to handle raw asset imports (replacement for webpack's raw-loader)
const rawLoaderPlugin = {
  name: 'raw-loader',
  setup(build) {
    // Handle imports with ?raw query or !!raw-loader! prefix
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      const cleanPath = args.path.replace(/\?raw$/, '').replace(/^!!raw-loader!/, '');
      return {
        path: join(args.resolveDir, cleanPath),
        namespace: 'raw-loader',
      };
    });

    build.onResolve({ filter: /^!!raw-loader!/ }, (args) => {
      const cleanPath = args.path.replace(/^!!raw-loader!/, '').replace(/\?raw$/, '');
      return {
        path: join(args.resolveDir, cleanPath),
        namespace: 'raw-loader',
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'raw-loader' }, (args) => {
      try {
        const contents = readFileSync(args.path, 'utf8');
        return {
          contents: `export default ${JSON.stringify(contents)};`,
          loader: 'js',
        };
      } catch (err) {
        return {
          errors: [{ text: `Failed to load raw file: ${args.path}: ${err.message}` }],
        };
      }
    });
  },
};

// Plugin to handle binary assets (favicon, images)
const assetPlugin = {
  name: 'asset-loader',
  setup(build) {
    build.onResolve({ filter: /\.(ico|png|jpe?g|gif|svg)$/ }, (args) => {
      if (args.path.includes('dist/app/insight')) {
        return {
          path: join(args.resolveDir, args.path),
          namespace: 'asset-inline',
        };
      }
      return null;
    });

    build.onLoad({ filter: /.*/, namespace: 'asset-inline' }, (args) => {
      try {
        const contents = readFileSync(args.path);
        const base64 = contents.toString('base64');
        const ext = args.path.split('.').pop();
        const mimeTypes = {
          ico: 'image/x-icon',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          svg: 'image/svg+xml',
        };
        const mime = mimeTypes[ext] || 'application/octet-stream';
        return {
          contents: `export default "data:${mime};base64,${base64}";`,
          loader: 'js',
        };
      } catch (err) {
        return {
          errors: [{ text: `Failed to load asset: ${args.path}: ${err.message}` }],
        };
      }
    });
  },
};

// Plugin to add shebang (createRequire is handled by esbuild automatically for ESM)
const shebangPlugin = {
  name: 'shebang-plugin',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;

      const outfile = join(outDir, 'main.js');
      try {
        let content = readFileSync(outfile, 'utf8');

        // Add shebang at the top if not already present
        if (!content.startsWith('#!')) {
          content = '#!/usr/bin/env node\n' + content;
        }

        writeFileSync(outfile, content);
        chmodSync(outfile, 0o755);
        console.log(`✔️ Made ${outfile} executable with shebang`);
      } catch (err) {
        console.warn(`⚠️ Could not process output file:`, err.message);
      }
    });
  },
};

// Build configuration
const buildOptions = {
  entryPoints: [join(__dirname, 'src/main.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: join(outDir, 'main.js'),
  sourcemap: true,
  keepNames: true, // Important for NestJS decorators
  minify: false,
  treeShaking: true,

  // External modules - only truly optional/problematic ones
  external: [
    // Optional NestJS modules that aren't installed
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    // Class-transformer optional import
    'class-transformer/storage',
  ],

  // Node.js built-in modules - these are always available
  // esbuild handles node: prefix automatically

  plugins: [
    // Note: SWC plugin disabled - using esbuild's TypeScript handling instead
    // Decorator metadata won't work, but type resolution will be correct
    // swcPlugin,      // Transform TypeScript with decorator metadata
    rawLoaderPlugin,
    assetPlugin,
    shebangPlugin,
  ],

  // Use tsconfig for proper TypeScript handling
  tsconfig: join(__dirname, 'tsconfig.app.json'),

  // Banner to provide createRequire for dynamic requires in ESM
  banner: {
    js: `import { createRequire as __createRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';
import { dirname as __dirname_fn } from 'path';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_fn(__filename);
const require = __createRequire(import.meta.url);
`,
  },

  // Define to help with conditional imports
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },

  // Loader configuration
  loader: {
    '.ts': 'ts',
    '.js': 'js',
    '.json': 'json',
  },


  // Log level
  logLevel: 'info',
};

async function build() {
  try {
    console.log('🔨 Building @intrig/core with esbuild...');
    const result = await esbuild.build(buildOptions);

    if (result.errors.length > 0) {
      console.error('Build failed with errors:', result.errors);
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('Build warnings:', result.warnings);
    }

    // Copy package.json with minimal dependencies
    const packageJson = {
      name: '@intrig/core',
      version: JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version,
      private: false,
      type: 'module',
      bin: {
        intrig: './main.js',
      },
      publishConfig: {
        access: 'public',
      },
      // No dependencies - everything is bundled!
      dependencies: {},
    };

    writeFileSync(
      join(outDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Copy README if exists
    try {
      const readme = readFileSync(join(rootDir, 'README.md'), 'utf8');
      writeFileSync(join(outDir, 'README.md'), readme);
    } catch {
      // README is optional
    }

    console.log('✅ Build complete!');
    console.log(`📦 Output: ${outDir}`);

  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
