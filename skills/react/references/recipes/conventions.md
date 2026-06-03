# TypeScript and Code Conventions

This is the single place for project-wide rules. All other recipes explain *what to build*; this one explains *how to write it consistently*. None of these patterns are in the React, TypeScript, or Zod docs — they are decisions we've made after hitting the problems they prevent.

The conventions here apply project-wide and build on the strict `tsconfig.json` from `project-config.md`. They fall into four areas: import discipline, type utilities, error handling, and environment config.


## Type-only imports (`verbatimModuleSyntax`)

See the [TypeScript docs on `verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) for what the flag does. Here's what it means in practice for this codebase:

Every import used only as a type **must** carry `type`:

```ts
import type { paths } from "~/shared/api/core-api-schema";         // whole-module
import { type UseFormReturn } from "react-hook-form";               // inline modifier
import { type InfiniteData, useMutation } from "@tanstack/react-query"; // mixed
```

`simple-import-sort` (configured in `eslint.config.js`) auto-orders imports into groups — let the linter fix ordering, don't do it by hand. The gotcha: ESLint and `tsc` both catch violations, but only `tsc` tells you _which_ import needs `type`. Run `pnpm typecheck` first when you see both failing.


## The `Prettify` helper

Generated types from OpenAPI (`*-api-schema.d.ts`) are often deeply nested intersections that appear as `A & B & C` in hover tooltips and error messages. That makes it hard to understand what the type actually contains.

`src/shared/types/index.ts`:

```ts
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
```

Wrapping a type in `Prettify<T>` forces TypeScript to eagerly expand the intersection, so hover tooltips show the flat object shape instead of the chain.

**When to use:** wrap generated API types and complex intersections when naming friendly aliases. See the next section.


## Re-derive names from generated API types

The generated `*-api-schema.d.ts` (produced by `openapi-typescript`) exposes raw `paths` and `components` exports. **Never hand-edit this file** — it is regenerated on every `pnpm run swagger-typegen` call.

Instead, create a `*-api-types.ts` companion that aliases names ergonomically. `src/shared/api/core-api-types.ts`:

```ts
import type { Prettify } from "../types";
import type { components } from "./core-api-schema";

type schema = components["schemas"];

// Simple aliases — just rename for readability
export type Item = schema["Item"];
export type CreateItemRequest = schema["CreateItemRequest"];

// Prettify complex or intersected types so errors are readable
export type StandardWidget = Prettify<schema["StandardWidget"]>;
export type CompactWidget = Prettify<schema["CompactWidget"]>;

// Derive a union and its discriminator from the generated types
export type Widget = StandardWidget | CompactWidget;
export type WidgetDiscriminator = Widget["$type"];
```

This is the only file the rest of the app imports API types from. If the backend renames a type, you update one place.


## Result helpers — don't throw across boundaries

Throwing errors across asynchronous boundaries is unpredictable: the call stack is gone, the error may not be an `Error` instance, and callers have no way to know a function can fail without reading its implementation.

The `tryCatch` / `tryCatchAsync` helpers return a typed result union instead of throwing. `src/shared/lib/utils.ts`:

```ts
export function tryCatch<T>(
  fn: () => T,
): T | { resultType: "unhandled_error"; error: Error } {
  try {
    return fn();
  } catch (error) {
    return {
      resultType: "unhandled_error",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function tryCatchAsync<T>(
  promise: Promise<T>,
): Promise<T | { resultType: "unhandled_error"; error: Error }> {
  try {
    return await promise;
  } catch (error) {
    return {
      resultType: "unhandled_error",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
```

Callers narrow on `"resultType" in result` to handle the error path:

```ts
const result = await tryCatchAsync(riskyOperation());
if ("resultType" in result) {
  // result.error is always an Error instance
  console.error(result.error.message);
  return;
}
// result is T here — TypeScript knows it's safe
```

**When to use:** wrapping third-party calls that can throw in unpredictable ways (JSON.parse, localStorage access, crypto operations). For HTTP calls, the `openapi-fetch` middleware handles errors centrally (see `data-fetching.md`).


## The `cn()` class helper

`cn()` is our single Tailwind class composition helper. It lives in `src/shared/lib/utils.ts` and is written by `shadcn@latest init` — see `shadcn-tailwind.md` section 7 for the implementation.

**Convention:** always pass `className` _into_ `cn()` as the last argument so caller overrides win:

```ts
// Wrong — caller className is ignored if it conflicts with defaults
cn("px-4", className)  // className "px-6" silently loses

// Right — caller wins because cn() / tailwind-merge uses "last one wins"
cn("px-4", className)  // with className="px-6": resolves to "px-6"
```

The `shadcn-tailwind.md` recipe covers when to use `cva()` for variant patterns.


## Zod-validated environment variables

Never access `process.env` or `import.meta.env` raw. Without validation, a missing variable causes a cryptic runtime crash deep in your application — often in production. With a Zod schema, you get a clear error at startup listing exactly which variables are missing.

`src/shared/env.ts`:

```ts
import * as z from "~/shared/zod";

const publicEnvSchema = z.object({
  REST_API_URI: z.string(),
  REPORTS_API_URI: z.string(),
  BILLING_API_URI: z.string(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SESSION_SECRET: z.string(),
});

export type PublicRuntimeEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((x) => x.path[0]);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
  return parsed.data;
}

export function getPublicEnv(): PublicRuntimeEnv {
  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((x) => x.path[0]);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
  return parsed.data;
}
```

**The public/server split:** `PublicRuntimeEnv` only contains variables safe to expose to the browser. `ServerEnv` extends it with secrets. Pass `PublicRuntimeEnv` into `createApiClients` so client factories never accidentally read server-only variables (see `data-fetching.md`).


## Naming conventions

- **Files:** `kebab-case` everywhere — `use-widget.ts`, `widget-form.tsx`, `widget-view-model.ts`.
- **Components:** `PascalCase` exports matching the filename — `WidgetForm` in `widget-form.tsx`.
- **Hooks:** `camelCase` starting with `use` — `useWidgets`, `useEditorSession`.
- **Stores:** `useXyzStore` for global singletons; `useXyz` for per-instance context hooks.
- **Types:** `PascalCase`. Split state and action types, intersect into the store type:
  ```ts
  type FooState = { ... };
  type FooActions = { ... };
  type FooStore = FooState & FooActions;
  ```
- **Avoid barrel `index.ts` files inside features** — they create implicit dependencies. Export directly from the file. `shared/` barrels are fine.
