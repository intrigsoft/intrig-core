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
  docs: [
    'intro',
    'getting-started',
    'thinking-in-intrig',
    {
      type: 'category',
      label: 'How Intrig Works',
      link: { type: 'doc', id: 'how-intrig-works/index' },
      collapsible: true,
      collapsed: false,
      items: [
        'how-intrig-works/synchronization',
        'how-intrig-works/code-generation',
        'how-intrig-works/mcp-integration',
      ],
    },
    'cli-reference',
    'insight',
    {
      type: 'category',
      label: "React",
      link: { type: "doc", id: 'react/index'},
      collapsed: true,
      collapsible: true,
      items: [
        'react/initialization',
        {
          type: 'category',
          label: 'Core Concepts',
          link: { type: 'doc', id: 'react/core-concepts/index' },
          collapsible: true,
          collapsed: true,
          items: [
            'react/core-concepts/entry-point',
            'react/core-concepts/hook-conventions',
            'react/core-concepts/state-management',
            'react/core-concepts/stateful-vs-stateless',
            'react/core-concepts/lifecycle-binding',
            'react/core-concepts/hierarchical-thinking',
          ],
        },
        {
          type: 'category',
          label: 'API Reference',
          link: { type: 'doc', id: 'react/api/index'},
          collapsible: true,
          collapsed: true,
          items: [
            'react/api/intrig-provider',
            'react/api/network-state',
            'react/api/is-success',
            'react/api/is-error',
            'react/api/is-pending',
            'react/api/is-init',
            'react/api/stateful-hook',
            'react/api/stateless-hook',
            'react/api/download-hook'
          ]
        }
      ]
    },
    {
      type: 'category',
      label: "Next.js",
      link: { type: "doc", id: 'next/index'},
      collapsed: true,
      collapsible: true,
      items: [
        'next/initialization',
        {
          type: 'category',
          label: 'Core Concepts',
          link: { type: 'doc', id: 'next/core-concepts/index' },
          collapsible: true,
          collapsed: true,
          items: [
            'next/core-concepts/server-client-architecture',
            'next/core-concepts/configuration-management',
            'next/core-concepts/server-side-functions',
            'next/core-concepts/client-side-hooks',
            'next/core-concepts/middleware-integration'
          ],
        },
        {
          type: 'category',
          label: 'API Reference',
          link: { type: 'doc', id: 'next/api/index'},
          collapsible: true,
          collapsed: true,
          items: [
            'next/api/server-functions',
            'next/api/intrig-layout',
            'next/api/network-state',
            'next/api/middleware',
            'next/api/stateful-hook',
            'next/api/stateless-hook',
            'next/api/download-hook',
            'next/api/is-success',
            'next/api/is-error',
            'next/api/is-pending',
            'next/api/is-init'
          ]
        }
      ]
    },
  ],
};

export default sidebars;
