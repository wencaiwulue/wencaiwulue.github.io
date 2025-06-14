// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '冯才文',
  tagline: '一个用心的人',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'wencaiwulue', // Usually your GitHub org/user name.
  projectName: 'wencaiwulue.github.io', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/wencaiwulue/wencaiwulue.github.io/tree/master',
          path: 'docs',         // 文档源文件目录
          routeBasePath: '/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/wencaiwulue/wencaiwulue.github.io/tree/master',
          blogSidebarCount: "ALL"
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: '冯才文',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'llm',
            position: 'left',
            label: '大模型',
          },
          {
            type: 'docSidebar',
            sidebarId: 'k8s',
            position: 'left',
            label: 'K8s',
          },
          {
            type: 'docSidebar',
            sidebarId: 'ide',
            position: 'left',
            label: 'Cloud IDE',
          },
          {
            type: 'docSidebar',
            sidebarId: 'blog',
            position: 'left',
            label: '博客',
          },
          {
            type: 'docSidebar',
            sidebarId: 'book',
            position: 'left',
            label: '技术书籍',
          },
          {
            type: 'docSidebar',
            sidebarId: 'note',
            position: 'left',
            label: '感悟',
          },
          {
            href: 'https://github.com/wencaiwulue',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '文章',
            items: [
              {
                label: '技术',
                to: 'quickstart',
              },
            ],
          },
          {
            title: '社区',
            items: [
              {
                label: 'Gitee',
                href: 'https://gitee.com/kubevpn',
              },
              {
                label: 'CSDN',
                href: 'https://blog.csdn.net/u012803274',
              },
            ],
          },
          {
            title: '更多',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/wencaiwulue/kubevpn',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} 冯才文, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        // ... Your options.
        // `hashed` is recommended as long-term-cache of index file is possible.
        hashed: true,
        // For Docs using Chinese, The `language` is recommended to set to:
        // ```
        language: ["en", "zh"],
        // ```
      }),
    ],
  ],
};

export default config;
