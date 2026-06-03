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
    "skills/aws/**",
    "skills/dev/**",
    "skills/docker/**",
    "skills/em/**",
    "skills/flow/**",
    "skills/gh/**",
    "skills/git/**",
    "skills/glab/**",
    "skills/icons/**",
    "skills/linear/**",
    "skills/mise/**",
    "skills/pm/**",
    "skills/pr/**",
    "skills/qa/**",
    "skills/skill/**",
    "skills/spec/**",
    "skills/task/**",
    "skills/terraform/**",
    "skills/ux/**",
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
          { text: "flow", link: "/skills/flow" },
          { text: "em · experimental", link: "/skills/em" },
          { text: "pm · experimental", link: "/skills/pm" },
          { text: "ux · experimental", link: "/skills/ux" },
        ],
      },
      {
        text: "Skills",
        items: [
          { text: "pr", link: "/skills/pr" },
          { text: "qa", link: "/skills/qa" },
          { text: "skill", link: "/skills/skill" },
          { text: "task", link: "/skills/task" },
        ],
      },
      {
        text: "Tools",
        items: [
          { text: "aws", link: "/skills/aws" },
          { text: "docker", link: "/skills/docker" },
          { text: "gcp", link: "/skills/gcp" },
          { text: "gh", link: "/skills/gh" },
          { text: "git", link: "/skills/git" },
          { text: "glab", link: "/skills/glab" },
          { text: "linear", link: "/skills/linear" },
          { text: "mise", link: "/skills/mise" },
          { text: "terraform", link: "/skills/terraform" },
        ],
      },
      {
        text: "Frameworks",
        items: [
          {
            text: "react",
            link: "/skills/react",
            collapsed: true,
            items: [
              {
                text: "React + Vite Project Setup",
                link: "/skills/react/recipes/project-config",
              },
              {
                text: "Feature-Sliced Project Layout",
                link: "/skills/react/recipes/folder-structure",
              },
              {
                text: "TypeScript and Code Conventions",
                link: "/skills/react/recipes/conventions",
              },
              {
                text: "Client State Management with Zustand",
                link: "/skills/react/recipes/zustand",
              },
              {
                text: "Building UI with shadcn/ui and Tailwind CSS",
                link: "/skills/react/recipes/shadcn-tailwind",
              },
              {
                text: "Data Fetching and Forms with TanStack Query",
                link: "/skills/react/recipes/data-fetching",
              },
              {
                text: "3D Scenes with React Three Fiber and Drei",
                link: "/skills/react/recipes/drei-threejs",
              },
            ],
          },
          {
            text: "sveltekit",
            link: "/skills/sveltekit",
            collapsed: true,
            items: [
              {
                text: "SvelteKit App Architecture",
                link: "/skills/sveltekit/recipes/frontend-architecture",
              },
              {
                text: "Feature-Slice Architecture in SvelteKit",
                link: "/skills/sveltekit/recipes/feature-architecture",
              },
              {
                text: "Building the App Shell",
                link: "/skills/sveltekit/recipes/app-shell",
              },
              {
                text: "Writing Composable Svelte 5 Components",
                link: "/skills/sveltekit/recipes/composable-components",
              },
              {
                text: "UI Components vs Feature Components",
                link: "/skills/sveltekit/recipes/ui-vs-feature-components",
              },
              {
                text: "shadcn-svelte, bits-ui, and tailwind-variants",
                link: "/skills/sveltekit/recipes/shadcn-svelte",
              },
              {
                text: "HTTP Service Clients",
                link: "/skills/sveltekit/recipes/service-clients",
              },
              {
                text: "Data Transformation with View Models",
                link: "/skills/sveltekit/recipes/view-model-parse",
              },
              {
                text: "Server-Side Remote Functions",
                link: "/skills/sveltekit/recipes/remote-functions",
              },
              {
                text: "Building Forms in a Feature Lib",
                link: "/skills/sveltekit/recipes/feature-lib-forms",
              },
              {
                text: "Typing Form Action Results",
                link: "/skills/sveltekit/recipes/form-result-type",
              },
              {
                text: "Auth Sessions with JWT Cookies",
                link: "/skills/sveltekit/recipes/auth-sessions",
              },
              {
                text: "Reactive State from Props in Svelte 5",
                link: "/skills/sveltekit/recipes/initializing-state-from-props",
              },
              {
                text: "Dynamic Components in Svelte 5",
                link: "/skills/sveltekit/recipes/dynamic-component",
              },
              {
                text: "Accessibility Patterns for Svelte",
                link: "/skills/sveltekit/recipes/a11y",
              },
              {
                text: "SvelteKit Config and Build Adapters",
                link: "/skills/sveltekit/recipes/config-and-build",
              },
            ],
          },
          {
            text: "tanstack",
            link: "/skills/tanstack",
            collapsed: true,
            items: [
              {
                text: "Scaffolding a TanStack Start Project",
                link: "/skills/tanstack/recipes/project-setup",
              },
              {
                text: "Project Conventions",
                link: "/skills/tanstack/recipes/conventions",
              },
              {
                text: "Type-Safe Routing with TanStack Router",
                link: "/skills/tanstack/recipes/router",
              },
              {
                text: "Server Functions and Validation",
                link: "/skills/tanstack/recipes/server-actions",
              },
              {
                text: "Protecting Routes with Auth Guards",
                link: "/skills/tanstack/recipes/auth-routes",
              },
              {
                text: "Async State with TanStack Query and Forms",
                link: "/skills/tanstack/recipes/query-and-forms",
              },
            ],
          },
        ],
      },
      {
        text: "Languages",
        items: [
          {
            text: "cpp",
            link: "/skills/cpp",
            collapsed: true,
            items: [
              {
                text: "Structuring a CMake Project",
                link: "/skills/cpp/recipes/cmake-structure",
              },
              {
                text: "C++ Code Standards",
                link: "/skills/cpp/recipes/code-standards",
              },
              {
                text: "Formatting, Linting, and Static Analysis",
                link: "/skills/cpp/recipes/formatting-and-analysis",
              },
              {
                text: "Managing C++ Dependencies with Conan",
                link: "/skills/cpp/recipes/conan-packages",
              },
              {
                text: "Debug, Release, and Sanitizer Build Profiles",
                link: "/skills/cpp/recipes/conan-profiles",
              },
              {
                text: "Publishing a Conan Package",
                link: "/skills/cpp/recipes/conan-publishing",
              },
              {
                text: "Monorepo with Multiple Libraries",
                link: "/skills/cpp/recipes/monorepo",
              },
              {
                text: "gRPC Services in C++",
                link: "/skills/cpp/recipes/grpc-patterns",
              },
              {
                text: "Conan Package Cache in CI",
                link: "/skills/cpp/recipes/ci-caching",
              },
            ],
          },
          {
            text: "python",
            link: "/skills/python",
            collapsed: true,
            items: [
              {
                text: "Python Project Setup with uv",
                link: "/skills/python/recipes/uv-workspace",
              },
              {
                text: "Python Project Conventions and Architecture",
                link: "/skills/python/recipes/service-patterns",
              },
              {
                text: "Publishing Python Packages with uv",
                link: "/skills/python/recipes/uv-publishing",
              },
              {
                text: "Experiment Tracking with MLflow",
                link: "/skills/python/recipes/mlflow",
              },
              {
                text: "Distributed Computing with Ray",
                link: "/skills/python/recipes/ray-training",
              },
              {
                text: "GPU Kernels with Nvidia Warp",
                link: "/skills/python/recipes/warp-hpc",
              },
              {
                text: "Data Validation with Pydantic",
                link: "/skills/python/recipes/pydantic",
              },
              {
                text: "CLI Commands with Click",
                link: "/skills/python/recipes/click-cli",
              },
            ],
          },
          {
            text: "typescript",
            link: "/skills/typescript",
            collapsed: true,
            items: [
              {
                text: "TypeScript Conventions: Strict Mode, Type Safety, and Error Handling",
                link: "/skills/typescript/recipes/typescript-conventions",
              },
              {
                text: "pnpm Monorepo Setup",
                link: "/skills/typescript/recipes/pnpm-workspace",
              },
              {
                text: "Managing Shared Dependencies with pnpm Catalogs",
                link: "/skills/typescript/recipes/pnpm-catalog",
              },
              {
                text: "Publishing TypeScript Packages",
                link: "/skills/typescript/recipes/pnpm-publishing",
              },
              {
                text: "Unit and E2E Testing with Vitest",
                link: "/skills/typescript/recipes/vitest",
              },
              {
                text: "Code Quality: ESLint, Prettier, and Pre-commit Hooks",
                link: "/skills/typescript/recipes/lint-format",
              },
              {
                text: "GitLab CI for pnpm Monorepos",
                link: "/skills/typescript/recipes/gitlab-ci",
              },
            ],
          },
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
