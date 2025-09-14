import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Intrig',
  tagline: 'API Development Made Simple',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://intrig.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'intrig', // Usually your GitHub org/user name.
  projectName: 'intrig-core', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/intrigsoft/intrig-core/tree/main/app/docs/',
        },
        blog: false, // Disable blog functionality
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: '',
      logo: {
        alt: 'Intrig',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'html',
          position: 'right',
          value: '<iframe src="https://github.com/sponsors/intrigsoft/button" title="Sponsor intrigsoft" height="32" width="114" style="border: 0; border-radius: 6px;"></iframe>',
        },
        {
          type: 'html',
          position: 'right',
          value: '<a href="https://github.com/intrigsoft/intrig-core" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" class="github-icon"><img src="/img/github-dark.svg" alt="GitHub" height="24" class="github-icon--light" style="vertical-align: middle;" /><img src="/img/github.svg" alt="GitHub" height="24" class="github-icon--dark" style="vertical-align: middle;" /></a>',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/intrigsoft/intrig-core',
            },
            {
              label: 'Sponsor on GitHub',
              href: 'https://github.com/sponsors/intrigsoft',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Intrig.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
