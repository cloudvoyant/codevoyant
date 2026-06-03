---
name: react
description: "React patterns: Zustand state management, shadcn/ui + Tailwind CSS, React Three Fiber + Drei for 3D, folder structure, data fetching, and TypeScript conventions. Load when working on React projects (*.tsx) without SvelteKit."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# react

Patterns for React 19 + TypeScript + Vite apps. Strict tsconfig, feature-sliced `src/`, TanStack Query over a typed `openapi-fetch` client, Zod-validated forms, Zustand for UI state, shadcn/ui + Tailwind v4, and React Three Fiber + Drei for 3D scenes.

## When to load recipes

| You are working on… | Load recipe |
|---|---|
| New React + Vite project setup | `references/recipes/project-config.md` |
| Feature folder structure | `references/recipes/folder-structure.md` |
| Zustand store | `references/recipes/zustand.md` |
| shadcn/ui components or Tailwind CSS | `references/recipes/shadcn-tailwind.md` |
| React Three Fiber / Drei 3D scene | `references/recipes/drei-threejs.md` |
| Data fetching, forms, Zod validation | `references/recipes/data-fetching.md` |

Load `project-config.md` + `folder-structure.md` for any new React project. The shadcn/Tailwind, Drei, and data-fetching recipes assume the project-config baseline (strict tsconfig, `~/*` alias, ESLint flat config) is already in place.

## Core Conventions

- React 19 + TypeScript ~5.9, Vite 7, pnpm
- Single strict `tsconfig.json` with `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `paths: { "~/*": ["./src/*"] }`
- ESLint flat config with feature-isolation rule (`no-restricted-imports` patterns: `~/features/*`)
- `src/` splits into `features/<feature>/` (business domains) and `shared/` (cross-cutting code)
- Feature hooks (`useWidgets`, `useEditorSession`) are the feature's public API — routes consume features through hooks, not by reaching into components
- Server/remote state lives in TanStack Query; UI/client state lives in Zustand
- API types are **generated** from OpenAPI via `openapi-typescript`; friendly names are re-derived in `*-api-types.ts`
- Form schemas are Zod discriminated unions; form types are always `z.infer<typeof schema>` — never hand-written
- Class composition through `cn()` (clsx + tailwind-merge) and `cva()` variant maps — Tailwind utilities reference theme tokens (`bg-primary`), never literal colors

## Stack Snapshot

- `react` 19, `react-dom` 19, `@types/react` 19, TypeScript `~5.9`
- Vite 7, Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js`)
- Data: `@tanstack/react-query` 5, `openapi-fetch` 0.15, `openapi-typescript` 7
- State: `zustand` 5 with `zustand/middleware` (persist) + `zustand/middleware/immer`
- Forms: `react-hook-form` 7, `@hookform/resolvers` 5, `zod` v4
- UI: `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, shadcn (new-york style)
- 3D: `three` `~0.182`, `@react-three/fiber` `^9`, `@react-three/drei` `^10` (versions pinned together)
