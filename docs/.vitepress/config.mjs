import { defineConfig } from "vitepress";

export default defineConfig({
  title: "codevoyant",
  description:
    "Development workflow skills for AI coding agents — Claude Code, OpenCode, and Copilot.",
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
      { text: "Skills", link: "/skills/spec" },
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
        text: "Skills",
        items: [
          { text: "Spec", link: "/skills/spec" },
          { text: "Dev", link: "/skills/dev" },
          { text: "EM · Experimental", link: "/skills/em" },
          { text: "PM · Experimental", link: "/skills/pm" },
          { text: "UX · Experimental", link: "/skills/ux" },
          { text: "Mem · Experimental", link: "/skills/mem" },
          { text: "Skill", link: "/skills/skill" },
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
