import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  whyIntrig: [
    'why-intrig/index',
    'why-intrig/state-of-codegen',
    'why-intrig/what-intrig-changes',
    'why-intrig/developer-experience',
    'why-intrig/for-managers-productivity',
    'why-intrig/parity-matrix',
  ],
  docs: [
    'index',
    {
      type: 'category',
      label: 'Core',
      items: [
        'core/overview',
        {
          type: 'category',
          label: 'CLI',
          items: [
            'core/cli',
            'core/cli/init',
            'core/cli/add',
            'core/cli/sync',
            'core/cli/generate',
            'core/cli/explore',
            'core/cli/ls',
            'core/cli/rm',
          ],
        },
        'core/openapi-mapping',
        'core/normalization',
        'core/versioning',
        'core/auth',
        'core/configuration',
        'core/ci-cd',
        'core/troubleshooting',
        'core/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Adapters',
      items: [
        {
          type: 'category',
          label: 'React',
          items: [
            'adapters/react/setup',
            'adapters/react/provider',
            'adapters/react/hooks',
            'adapters/react/sse',
            'adapters/react/patterns',
            'adapters/react/recipes',
            'adapters/react/reference',
          ],
        },
        {
          type: 'category',
          label: 'Next.js',
          items: [
            'adapters/next/setup',
            'adapters/next/server-actions',
            'adapters/next/proxy',
            'adapters/next/auth',
            'adapters/next/recipes',
            'adapters/next/reference',
          ],
        }
      ],
    },
    {
      type: 'category',
      label: 'Cookbook',
      items: [
        'cookbook/list-table',
        'cookbook/mutations-optimistic',
        'cookbook/files-download-upload',
        'cookbook/sse-live-updates',
        'cookbook/auth-injection',
        'cookbook/error-boundaries',
        'cookbook/edge-validation',
      ],
    },
    {
      type: 'category',
      label: 'Samples',
      items: [
        'samples/index',
        'samples/react-starter',
        'samples/next-starter',
      ],
    },
    {
      type: 'category',
      label: 'Integration Guides',
      items: [
        'integrations/keycloak',
        'integrations/next-auth',
        'integrations/insight-embed',
        'integrations/nx-monorepo',
        'integrations/proxy-gateway',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/types',
        'reference/generator-config',
        'reference/normalization-api',
        'reference/adapter-index',
      ],
    },
    {
      type: 'category',
      label: 'Upgrades & Migrations',
      items: [
        'migrations/releases',
        'migrations/breaking',
        'migrations/adapter-parity',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/index',
        'contributing/project-structure',
        'contributing/new-adapter-checklist',
        'contributing/docs-style-guide',
        'contributing/issue-templates',
        'code-of-conduct',
      ],
    },
  ],
};

export default sidebars;
