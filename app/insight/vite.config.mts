/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/app/insight',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@intrig": path.resolve(__dirname, "./src/@intrig")
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/app/insight',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    // Use relative paths for assets when served from any base URL
    base: './',
    rollupOptions: {
      output: {
        // single entrypoint bundle
        entryFileNames:  'assets/index.js',
        // any lazy chunks (vendor split, etc)
        chunkFileNames:  'assets/[name].js',
        // CSS / other assets
        assetFileNames: assetInfo => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/index.css';
          }
          // images, fonts, icons, etc:
          return 'assets/[name][extname]';
        }
      }
    }
  },
}));
