---
title: typescript
---

# typescript

Context skill for TypeScript projects covering type safety patterns, pnpm monorepo management, package publishing, Vitest testing, ESLint/Prettier, and GitLab CI.

## Philosophy

All projects enable `strict: true` in `tsconfig.json` and avoid type casts in favour of narrowing or using types exported by the libraries in use. Workspaces are managed with pnpm; packages are linked via workspace protocol rather than copied. Tests run with Vitest using `--import-mode=importlib` so same-named test files can coexist across packages. Linting and formatting are enforced by pre-commit hooks so CI never sees unformatted code.

## Recipes

- [TypeScript Conventions: Strict Mode, Type Safety, and Error Handling](./typescript/recipes/typescript-conventions) — strict mode setup, `unknown` in catch, avoiding casts, Zod schema typing, naming
- [pnpm Monorepo Setup](./typescript/recipes/pnpm-workspace) — workspace declaration, internal libs with workspace:*, consuming packages
- [Managing Shared Dependencies with pnpm Catalogs](./typescript/recipes/pnpm-catalog) — catalogs, named catalogs, supply-chain guard with onlyBuiltDependencies
- [Publishing TypeScript Packages](./typescript/recipes/pnpm-publishing) — npm and GitLab registry, dual ESM/CJS, Changesets
- [Unit and E2E Testing with Vitest](./typescript/recipes/vitest) — unit, integration, and Playwright browser tests
- [Code Quality: ESLint, Prettier, and Pre-commit Hooks](./typescript/recipes/lint-format) — flat config, module boundaries, husky/lint-staged
- [GitLab CI for pnpm Monorepos](./typescript/recipes/gitlab-ci) — cached installs, per-package change detection, publish

## References

- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Vitest documentation](https://vitest.dev)
