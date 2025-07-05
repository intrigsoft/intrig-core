// This version will be replaced during build
const version = '__INTRIG_REGISTRY_VERSION__';
export default {
  react: `@intrig/react@${version}`,
  next: `@intrig/next@${version}`
} satisfies Record<string, string>
