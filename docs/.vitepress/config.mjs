import { defineConfig } from "vitepress";

export default defineConfig({
  title: "codevoyant",
  description:
    "Development workflow plugins for AI coding agents — Claude Code, OpenCode, and Copilot.",
  base: "/codevoyant/",

  head: [
    [
      "link",
      {
        rel: "icon",
        href: "/codevoyant/favicon-light.ico",
        media: "(prefers-color-scheme: light)",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        href: "/codevoyant/favicon-dark.ico",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  ],

  themeConfig: {
    logo: {
      light: "/codevoyant-logo-light.svg",
      dark: "/codevoyant-logo-dark.svg",
    },

    nav: [
      { text: "Guide", link: "/user-guide" },
      { text: "Plugins", link: "/plugins/spec" },
      { text: "Changelog", link: "/changelog" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Overview", link: "/" },
          { text: "Installation", link: "/installation" },
          { text: "User Guide", link: "/user-guide" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Spec", link: "/plugins/spec" },
          { text: "Dev", link: "/plugins/dev" },
          { text: "EM · Experimental", link: "/plugins/em" },
          { text: "PM · Experimental", link: "/plugins/pm" },
          { text: "UX · Experimental", link: "/plugins/ux" },
          { text: "Memory", link: "/plugins/memory" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "@codevoyant/agent-kit", link: "/reference/agent-kit" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/cloudvoyant/codevoyant" },
    ],

    editLink: {
      pattern: "https://github.com/cloudvoyant/codevoyant/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © Cloudvoyant",
    },

    search: {
      provider: "local",
    },

    outline: {
      level: [2, 3],
    },
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});
