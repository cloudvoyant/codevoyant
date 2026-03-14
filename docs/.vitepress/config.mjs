import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'claudevoyant',
  description: 'Professional workflow plugins for AI coding agents — Claude Code, OpenCode, and VS Code Copilot.',
  base: '/claudevoyant/',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '🔭',

    nav: [
      { text: 'Guide', link: '/user-guide' },
      { text: 'Plugins', link: '/plugins/spec' },
      { text: 'Changelog', link: '/changelog' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Installation', link: '/installation' },
          { text: 'User Guide', link: '/user-guide' },
        ],
      },
      {
        text: 'Plugins',
        items: [
          { text: 'Spec', link: '/plugins/spec' },
          { text: 'Dev', link: '/plugins/dev' },
          { text: 'Style', link: '/plugins/style' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cloudvoyant/claudevoyant' },
    ],

    editLink: {
      pattern: 'https://github.com/cloudvoyant/claudevoyant/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Cloudvoyant',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
