# Feature-Sliced Project Layout

## Why this matters

The most common way React projects fall apart is through uncontrolled coupling — a "widgets" page imports a helper from the "accounts" feature because it was convenient at the time, then "accounts" imports something from "billing", and eventually you have a graph of dependencies no one can untangle.

The feature-sliced layout solves this with one simple rule enforced by ESLint: **features cannot import other features**. Everything the whole app shares lives in `shared/`. Routes and pages are the only things allowed to compose features together.

Without this boundary:
- Refactoring a feature risks breaking every other feature that secretly depends on it.
- Testing a feature in isolation is impossible because it has surprise transitive dependencies.
- New engineers can't understand where code "belongs" because there's no structural constraint.

With this layout, each feature is self-contained. You can read, test, or delete a feature folder without touching anything else.


## 1. Two top-level buckets

```bash
mkdir -p src/features src/shared
```

Everything in `src/` falls into one of two buckets:

- `src/features/<feature>/` — one folder per business domain (`widgets`, `items`, `accounts`).
- `src/shared/` — cross-cutting code importable from anywhere.

Target layout:

```
src/
  main.tsx                 # app entry point
  styles.css               # Tailwind entry (see shadcn-tailwind.md)
  features/
    widgets/
    items/
  shared/
    api/                   # data layer — see data-fetching.md
    components/            # shadcn ui/ + app components (see shadcn-tailwind.md)
    hooks/                 # generic hooks (use-is-visible, use-responsive)
    lib/                   # utils.ts (cn, tryCatch) — see conventions.md
    stores/                # global zustand stores — see zustand.md
    types/                 # global type helpers (Prettify) — see conventions.md
    zod/                   # zod barrel + helpers — see data-fetching.md
    env.ts                 # Zod-validated env — see conventions.md
```

In a monorepo, the most reusable `shared/` libraries (UI, schema, services) can graduate into pnpm workspace packages under `libs/{ui,schema,services,...}`. The feature/shared split inside each app stays the same.


## 2. Inside a feature

Each feature is organized by role, not by file type. You won't see a flat list of `*.ts` files — instead, subfolders declare what each file does:

```bash
mkdir -p src/features/widgets/{components,hooks,schemas,view-models}
```

```
src/features/widgets/
  README.md              # one paragraph: what this feature does, its hooks, key components
  components/            # widget-form.tsx, widgets-page.tsx, widget-data-table.tsx
  hooks/                 # use-widget.ts, use-widgets.ts  ← the feature's PUBLIC API
  schemas/               # widget-form.ts  (Zod schema + WidgetFormData type + defaults)
  view-models/           # widget-view-model.ts, widget-group-view-model.ts
  constants/             # literal config values (optional)
```

**Key convention: the feature's hooks are its public API.**

Routes and pages consume a feature by calling its hook (`useWidgets(shopId)`), not by reaching into its components. This means:

- The internal structure of a feature can change freely — as long as the hook's return shape stays compatible, nothing outside breaks.
- You can add error boundaries and `<Suspense>` at the route level without knowing what the feature does internally.
- A new engineer reading a route sees `useWidgets` and knows exactly where to find the feature's entry point.

Not every feature needs every folder — only add `schemas/` and `view-models/` when there are forms.


## 3. Import with the `~/*` alias

Within `src/`, always use the `~/*` alias for cross-folder imports:

```ts
// Good — alias-based, works no matter where the file lives
import { Button } from "~/shared/components/ui/button";
import { useWidgets } from "~/features/widgets/hooks/use-widgets";
```

Relative imports are fine **within** a single feature — they communicate "this file and the one it's importing are part of the same unit":

```ts
// Good — relative within the same feature
import { WidgetForm } from "../components/widget-form";
```

Avoid deep relative paths across features or into `shared/`:

```ts
// Bad — fragile, hard to read, breaks on file moves
import { Button } from "../../../shared/components/ui/button";
```


## 4. The feature isolation rule

The ESLint config from `project-config.md` enforces the boundary automatically:

```js
{ files: ["**/features/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] } },
{ files: ["**/shared/**/*.{ts,tsx}"],
  rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] } },
```

What this enforces:
- A file under `features/` may **not** import from `~/features/*` — no feature-to-feature imports.
- A file under `shared/` may **not** import from `~/features/*` — shared code stays free of feature dependencies.
- Need to share code between two features? **Promote it to `shared/`.**
- Routes and pages live outside both buckets and **are** allowed to import features to compose pages.


## Verify

```bash
pnpm run lintcheck
```

To confirm the rule works, add a deliberate cross-feature import inside a feature file (e.g. `import { something } from "~/features/items/hooks/use-items"` from inside `features/widgets/`) and confirm ESLint reports an error. Then revert.
