# Feature-Sliced Project Layout

## Why this matters

The most common way React projects fall apart is through uncontrolled coupling. A "widgets" page imports a helper from "accounts" because it was convenient, "accounts" imports something from "billing", and eventually you have a dependency graph no one can untangle.

The naive fix — "features can never import other features" — solves the coupling problem but is too strict in practice. Some features (authentication, user profile) are genuinely cross-cutting; blocking their use inside other features just pushes the problem into `shared/` or forces awkward prop-drilling.

The right rule is a **directed acyclic graph (DAG)**. Most features have no cross-feature imports. A small set of pervasive features (auth, user-profile) may be imported by other features, but only through their public API and only in directions that do not create a cycle. If adding an import would create a cycle, the dependency is wrong.

Without structural enforcement:
- Refactoring a feature risks breaking every other feature that secretly depends on it.
- Testing a feature in isolation is impossible because of surprise transitive dependencies.
- New engineers can't tell where code belongs because there's no structural constraint.

With a DAG-enforced layout, the dependency flow is predictable. You can read, test, or delete a feature without touching anything else, while still allowing the handful of imports that are genuinely needed.


## 1. Monorepo layout

In a monorepo, features and shared libraries are first-class workspace packages under `libs/`. Each deployed app lives under `apps/` and composes those libraries.

```
apps/
  web/                     # deployed app
    src/
      main.tsx
      styles.css
      routes/              # thin coordinators — call feature hooks, compose pages
      hooks/               # app-level hooks (not owned by any feature)
      validators/          # app-level validation (route params, env)
      mappers/             # app-level mappers
      db/                  # DB entities and services owned solely by this app
      generated/           # generated code — OpenAPI types, GraphQL, codegen output
      shared/              # cross-app utilities: api client, components, lib, stores, types, env.ts
libs/
  feature-auth/            # pervasive feature — allowed DAG import node
  feature-user-profile/    # pervasive feature — allowed DAG import node
  feature-widgets/         # domain feature
  feature-billing/         # domain feature
  shared/                  # cross-cutting libs — UI primitives, formatters, types (no business logic)
  ui/                      # generic UI component library
```

**Pervasive vs. domain features.** `feature-auth` and `feature-user-profile` are tagged as pervasive because almost every other feature legitimately needs them (e.g., the current user's ID, auth guards). Domain features like `feature-widgets` and `feature-billing` have no such universal need and should not be imported by other features.


## 2. Single-app layout

For projects that are not a monorepo, features and shared code live inside `src/`:

```
src/
  main.tsx
  styles.css
  routes/                  # thin coordinators — call feature hooks, compose pages
  hooks/                   # app-level hooks
  validators/              # app-level validation (route params, env)
  mappers/                 # app-level mappers
  generated/               # generated code — never hand-edit
  shared/                  # api client, components, lib, stores, types, env.ts
  features/
    auth/                  # pervasive feature
    user-profile/          # pervasive feature
    widgets/               # domain feature
    billing/               # domain feature
```

The same DAG import rules and public-API conventions apply. The only difference from the monorepo is that features are folders rather than workspace packages, and ESLint `no-restricted-imports` patterns are used instead of package-level boundaries.


## 3. Inside a feature lib

Each feature is organized by role, not by file type:

```
libs/feature-widgets/
  src/
    components/            # React components — widget-form.tsx, widgets-page.tsx
    hooks/                 # feature hooks — the public API (use-widgets.ts, use-widget.ts)
    view-models/           # Zod schemas + TS types (widget-view-model.ts)
    validators/            # input schemas (create-widget.schema.ts)
    types/                 # TypeScript types private to this feature
    server/                # server actions/queries — only if fullstack and NOT shared
  index.ts                 # deliberate public API — only export what routes need
  package.json
```

**Why each folder exists:**

- `hooks/` is the feature's public API. Routes and pages call `useWidgets(shopId)`, not internal components or queries. The internal structure can change freely as long as hook signatures stay compatible.
- `view-models/` separates the shape of data that reaches the UI (a TS type + Zod schema) from the raw API response. This keeps components free of mapping logic.
- `validators/` holds input schemas for forms and server actions — separate from view-models because they validate write intent, not read shape.
- `server/` contains server actions or RPC calls that are specific to this feature and not reused elsewhere. If a query is shared, it belongs in `libs/shared` or a dedicated service lib.
- `index.ts` is the feature's deliberate public surface. Only symbols exported here are importable by routes or (for pervasive features) other features.

Not every feature needs every folder — only add `validators/` and `view-models/` when there are forms or data-transformation needs.


## 4. Within-app structure rules

**Routes are thin.** A route file calls feature hooks, wires form actions, and composes the page. It contains no business logic. If you find yourself writing conditional data-transformation or domain rules inside a route, that logic belongs in a feature hook.

**Co-location is limited.** Private types, private mappers, and private objects that are used only within a single file or folder may be co-located. Anything used in more than one place moves to the appropriate feature, shared lib, or app-level folder.

**Cross-cutting concerns are their own lib.** A logger, analytics client, or feature-flag adapter is either a dedicated `libs/logger` (etc.) package or a third-party dependency. It is never a "shared util" that quietly accumulates unrelated helpers.

**`generated/` is read-only.** Any file under `generated/` is produced by a codegen tool (OpenAPI type generation, GraphQL codegen, Prisma client, etc.). These files are never hand-edited. If you need to extend a generated type, do it in a wrapper in `types/` or `view-models/`.


## 5. The feature import DAG

### Most features: no cross-feature imports

Domain features (`feature-widgets`, `feature-billing`) may not import each other. If two domain features need to share data or behavior, use one of the cross-feature coordination mechanisms below.

### Pervasive features: DAG-whitelisted imports

Pervasive features (`feature-auth`, `feature-user-profile`) may be imported from other features, subject to two constraints:

1. Only import from the feature's public `index.ts` — never from internal paths.
2. The resulting dependency graph must remain a DAG. If adding the import creates a cycle, the design is wrong.

```ts
// Good — importing from pervasive feature's public API
import { useCurrentUser } from "@acme/feature-user-profile";
import { useAuth } from "@acme/feature-auth";

// Bad — reaching into internals
import { userQueryKey } from "@acme/feature-user-profile/src/hooks/use-current-user";
```

### Cross-feature coordination mechanisms

When two features need to interact, prefer these mechanisms in order:

**1. Shared application store with event publishing**

A feature writes to a store; other features react to it. Neither feature imports the other.

```ts
// libs/feature-widgets/src/hooks/use-create-widget.ts
import { useAppStore } from "~/shared/stores/app-store";

export function useCreateWidget() {
  const notify = useAppStore((s) => s.publishEvent);
  return useMutation({
    onSuccess: (widget) => notify({ type: "widget.created", payload: widget }),
  });
}

// libs/feature-billing/src/hooks/use-billing-alerts.ts
import { useAppStore } from "~/shared/stores/app-store";

export function useBillingAlerts() {
  // reacts to widget.created without importing feature-widgets
  const events = useAppStore((s) => s.events);
  // ...
}
```

**2. Cache data synchronization**

Features read from the same React Query cache key. A mutation in one feature that invalidates a shared key causes any other feature listening to that key to refetch automatically.

```ts
// Shared cache key definition — lives in libs/shared or apps/web/src/shared
export const WIDGET_LIST_KEY = (shopId: string) => ["widgets", shopId] as const;

// feature-widgets writes
queryClient.invalidateQueries({ queryKey: WIDGET_LIST_KEY(shopId) });

// feature-billing reads the same key — no import of feature-widgets needed
const { data } = useQuery({ queryKey: WIDGET_LIST_KEY(shopId), ... });
```

**3. Route-level or shared-lib composition**

For complex coordination that doesn't fit the store or cache patterns, handle it in the route (which is allowed to import any feature) or extract a small compositor component into `libs/shared` (or `apps/web/src/shared`).

```tsx
// apps/web/src/routes/shop.$shopId.tsx — route composes two features
import { useWidgets } from "@acme/feature-widgets";
import { useBillingStatus } from "@acme/feature-billing";

export default function ShopPage() {
  const widgets = useWidgets(shopId);
  const billing = useBillingStatus(shopId);
  return <ShopLayout widgets={widgets} billing={billing} />;
}
```

### ESLint enforcement

Replace the blanket `no-restricted-imports` rule with a DAG-aware approach. Pervasive feature packages are whitelisted; all other cross-feature imports are blocked.

```js
// eslint.config.js (flat config)
{
  files: ["libs/feature-*/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        // block all cross-feature imports ...
        { group: ["*/feature-*", "~/features/*"], message: "Features may not import other features." },
      ],
    }],
  },
},
{
  // ... then whitelist pervasive features for domain features
  files: ["libs/feature-widgets/**", "libs/feature-billing/**", "src/features/widgets/**", "src/features/billing/**"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["*/feature-*", "~/features/*"],
          // allow only pervasive features by listing their package names or paths here
          // use eslint-plugin-boundaries for more expressive DAG rules
          message: "Import only from @acme/feature-auth or @acme/feature-user-profile." },
      ],
    }],
  },
},
```

For larger teams, `eslint-plugin-boundaries` provides a more expressive way to declare the allowed graph as a configuration rather than an enumerated pattern list.


## 6. Import with the `~/` alias

Within `src/` (single-app) or within `apps/web/src/` (monorepo), use the `~/` alias for cross-folder imports:

```ts
// Good — alias-based, works no matter where the file lives
import { Button } from "~/shared/components/ui/button";
import { useWidgets } from "~/features/widgets/hooks/use-widgets";
```

Relative imports are fine within a single feature — they communicate that the two files are part of the same unit:

```ts
// Good — relative within the same feature
import { WidgetForm } from "../components/widget-form";
```

Avoid deep relative paths that cross feature or shared boundaries:

```ts
// Bad — fragile, hard to read, breaks on file moves
import { Button } from "../../../shared/components/ui/button";
```

In the monorepo, imports across `libs/` packages use the package name directly (e.g. `import { useCurrentUser } from "@acme/feature-user-profile"`), not path aliases.


## Verify

```bash
pnpm run lintcheck
```

To confirm DAG enforcement works, add a deliberate invalid cross-feature import inside a domain feature file (e.g. `import { something } from "@acme/feature-billing"` from inside `feature-widgets/`) and confirm ESLint reports an error. Then verify that importing from a whitelisted pervasive feature (e.g. `@acme/feature-auth`) does not report an error. Revert both changes.
