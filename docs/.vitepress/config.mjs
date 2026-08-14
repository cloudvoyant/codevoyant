import { defineConfig } from "vitepress";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  title: "codevoyant",
  description:
    "Development workflow skills for AI coding agents — Claude Code, OpenCode, and Copilot.",
  base: "/codevoyant/",
  srcDir: "..",
  srcExclude: [
    // Root-level files
    "README.md",
    "CHANGELOG.md",
    "CLAUDE.md",
    // Internal dirs
    ".claude/**",
    ".memsearch/**",
    ".codevoyant/**",
    // Non-recipe skills (exclude entirely)
    "skills/changelog/**",
    "skills/cz/**",
    "skills/dev/**",
    "skills/docs/**",
    "skills/ed/**",
    "skills/em/**",
    "skills/flow/**",
    "skills/gh/**",
    "skills/git/**",
    "skills/glab/**",
    "skills/hx/**",
    "skills/icons/**",
    "skills/linear/**",
    "skills/mise/**",
    "skills/pm/**",
    "skills/pr/**",
    "skills/qa/**",
    "skills/release/**",
    "skills/skill/**",
    "skills/spec/**",
    "skills/task/**",
    "skills/usage/**",
    "skills/ux/**",
    "skills/vim/**",
    "skills/zellij/**",
    // Recipe skills: exclude non-recipe files
    "skills/*/SKILL.md",
    "skills/*/LICENSE.md",
    "skills/*/references/workflows/**",
    "skills/*/references/templates/**",
    "skills/*/references/agents/**",
    "skills/*/references/*.md",
    "skills/*/agents/**",
  ],

  rewrites: {
    "docs/:path*": ":path*",
    "skills/:skill/references/recipes/:recipe":
      "skills/:skill/recipes/:recipe",
  },

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
          { text: "docs", link: "/skills/docs" },
          { text: "flow", link: "/skills/flow" },
          { text: "pr", link: "/skills/pr" },
          { text: "qa", link: "/skills/qa" },
          { text: "skill", link: "/skills/skill" },
        ],
      },
      {
        text: "Domains",
        items: [
          { text: "em · experimental", link: "/skills/em" },
          { text: "pm · experimental", link: "/skills/pm" },
          { text: "ed · experimental", link: "/skills/ed" },
          { text: "ux · experimental", link: "/skills/ux" },
        ],
      },
      {
        text: "Tools",
        items: [
          { text: "changelog", link: "/skills/changelog" },
          { text: "cz", link: "/skills/cz" },
          { text: "gh", link: "/skills/gh" },
          { text: "git", link: "/skills/git" },
          { text: "glab", link: "/skills/glab" },
          { text: "linear", link: "/skills/linear" },
          { text: "mise", link: "/skills/mise" },
          { text: "release", link: "/skills/release" },
          { text: "task", link: "/skills/task" },
          { text: "usage", link: "/skills/usage" },
          { text: "vim", link: "/skills/vim" },
          { text: "hx", link: "/skills/hx" },
          { text: "zellij", link: "/skills/zellij" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Changelog", link: "/changelog" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/cloudvoyant/codevoyant" },
    ],

    editLink: {
      pattern: ({ filePath }) =>
        `https://github.com/cloudvoyant/codevoyant/edit/main/${filePath}`,
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

  vite: {
    // srcDir is now project root; restore docs/public as the static asset dir
    publicDir: resolve(__dirname, "../public"),
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
    config(md) {
      // Escape {{ and }} inside inline code spans so Vue's template compiler
      // doesn't parse them as interpolation expressions. (Fenced code blocks
      // go through shiki which splits {{ across <span> tags, so they're safe.)
      const defaultCodeInline = md.renderer.rules.code_inline?.bind(
        md.renderer.rules
      );
      md.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
        const html =
          defaultCodeInline?.(tokens, idx, options, env, self) ??
          self.renderToken(tokens, idx, options);
        return html
          .replace(/\{\{/g, "&#123;&#123;")
          .replace(/\}\}/g, "&#125;&#125;");
      };
    },
  },
});
