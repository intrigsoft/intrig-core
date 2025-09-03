import { createUnplugin } from 'unplugin';
import { DaemonManager, isIntrigProject } from './daemon-status';

export interface CorePluginOptions {
  // Plugin options can be defined here
  [key: string]: any;
}

export const core = createUnplugin<CorePluginOptions | undefined>(
  (options = {}) => ({
    name: '@intrig/plugin-core',
    async buildStart() {
      console.log('🚀 @intrig/plugin-core buildStart');

      // Check if this is an Intrig-powered project
      if (!isIntrigProject()) {
        console.warn(
          '⚠️  Warning: This is not an Intrig-powered project (intrig.config.json not found)',
        );
        console.warn('   Skipping Intrig plugin processes...');
        return;
      }

      const daemonManager = new DaemonManager();
      await daemonManager.ensureDaemonRunning();
      await daemonManager.checkHashesAndGenerate();
    },
    transformInclude(id) {
      // Define which files should be transformed
      return false; // Modify this based on your needs
    },
    transform(code, id) {
      // Transform code if needed
      return null;
    },
  }),
);

// Export bundler-specific versions
export const vite = core.vite;
export const webpack = core.webpack;
export const rollup = core.rollup;
export const esbuild = core.esbuild;

export default core;
