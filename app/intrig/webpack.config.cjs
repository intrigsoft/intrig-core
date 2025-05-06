const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const webpack = require('webpack')
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

module.exports = {
  output: {
    path: join(__dirname, '../../dist/app/intrig'),
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
      entryOnly: true,
    }),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
    new MakeExecutablePlugin(),
  ],
};
