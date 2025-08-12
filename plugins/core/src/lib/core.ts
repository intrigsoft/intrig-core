import { createUnplugin } from 'unplugin';

export interface CorePluginOptions {
  // Plugin options can be defined here
  [key: string]: any;
}

export const core = createUnplugin<CorePluginOptions | undefined>((options = {}) => ({
  name: '@intrig/plugin-core',
  buildStart() {
    console.log('core plugin buildStart');
  },
  transformInclude(id) {
    // Define which files should be transformed
    return false; // Modify this based on your needs
  },
  transform(code, id) {
    // Transform code if needed
    return null;
  },
}));

// Export bundler-specific versions
export const vite = core.vite;
export const webpack = core.webpack;
export const rollup = core.rollup;
export const esbuild = core.esbuild;

export default core;
