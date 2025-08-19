// Re-export the CommonJS Jest config to avoid TS/ESM resolution issues during Nx Jest execution.
/* eslint-disable */
// @ts-ignore - CJS module has no type declarations
export { default } from './jest.config.cjs';
