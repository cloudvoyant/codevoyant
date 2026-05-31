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
        text: "Workflows",
        items: [
          { text: "spec", link: "/skills/spec" },
          { text: "dev", link: "/skills/dev" },
          { text: "em · experimental", link: "/skills/em" },
          { text: "pm · experimental", link: "/skills/pm" },
          { text: "ux · experimental", link: "/skills/ux" },
        ],
      },
      {
        text: "Skills",
        items: [
          { text: "git", link: "/skills/git" },
          { text: "skill", link: "/skills/skill" },
          { text: "tasks", link: "/skills/tasks" },
        ],
      },
      {
        text: "Tools",
        items: [
          { text: "docker", link: "/skills/docker" },
          { text: "gcp", link: "/skills/gcp" },
          { text: "mise", link: "/skills/mise" },
          { text: "terraform", link: "/skills/terraform" },
        ],
      },
      {
        text: "Frameworks",
        items: [
          { text: "sveltekit", link: "/skills/sveltekit" },
        ],
      },
      {
        text: "Languages",
        items: [
          { text: "typescript", link: "/skills/typescript" },
        ],
      },
      {
        text: "Reference",
        items: [
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
