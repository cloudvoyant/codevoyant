---
name: typescript
description: "TypeScript patterns: type safety, pnpm monorepo management, package publishing, Vitest testing, ESLint/Prettier, and GitLab CI. Load when working with TypeScript, pnpm workspaces, or JS/TS toolchain."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# TypeScript Recipes

## When to load recipes

| You are working on...                            | Load recipe                                               |
| ------------------------------------------------ | --------------------------------------------------------- |
| Error handling in a catch block                  | `recipes/unknown-catch.md`                                |
| A library API rejecting your type                | `recipes/use-library-types.md`                            |
| A function that accepts a Zod schema             | `recipes/zod-generic-bounds.md`                           |
| strict mode, naming, avoiding casts, Zod typing  | `references/recipes/typescript-conventions.md`            |
| pnpm workspace setup or inter-package deps       | `references/recipes/pnpm-workspace.md`                    |
| Publishing a package to npm or GitLab registry   | `references/recipes/pnpm-publishing.md`                   |
| Vitest unit tests or Playwright e2e              | `references/recipes/vitest.md`                            |
| ESLint, Prettier, or pre-commit hooks            | `references/recipes/lint-format.md`                       |
| GitLab CI pipeline for a pnpm monorepo           | `references/recipes/gitlab-ci.md`                         |
