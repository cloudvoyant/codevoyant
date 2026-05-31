# Recipe: Frontend Architecture with Feature-Slice

## Pattern

Route -> feature server function -> view model -> component.

## Route (`+page.server.ts`)

```ts
// apps/web/src/routes/foo/+page.server.ts
import { getFooPage } from "@readership/feature-foo";

export const load = async ({ locals }) => {
  const session = await getSession(locals);
  return getFooPage(session.user.handle);
};
```

## Feature server function (`feature-foo/src/server.ts`)

```ts
import { fooService } from "./services/foo";

export async function getFooPage(handle: string) {
  return fooService.getFoo(handle); // returns FooViewModel
}
```

## View model (`view-models/foo.ts`)

```ts
import { z } from "zod";

export const FooViewModelSchema = z.object({
  id: z.string(),
  title: z.string(),
  // only fields the UI renders
});
export type FooViewModel = z.infer<typeof FooViewModelSchema>;
```

## Component (`+page.svelte`)

```svelte
<script lang="ts">
  import { FooCard } from '@readership/feature-foo';
  let { data } = $props();
</script>

<FooCard foo={data.foo} />
```

## Feature modules vs non-feature modules

**Feature modules** (`libs/feature-X/`) own a slice of product functionality end-to-end: VM, service, components, and server function. They have business logic and are allowed to import from DB docs. One feature per domain (publications, series, feed, …).

**Non-feature modules** are shared infrastructure with no business logic:

| Module                | Purpose                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `libs/ui/`            | Generic, unstyled or lightly-styled UI primitives (Button, Card, Tabs, …)             |
| `libs/shared/`        | Pure utilities with no framework dependencies (formatters, validators, …)             |
| `libs/models/`        | Shared TypeScript types used across features                                          |
| `libs/db/`            | Firestore document definitions — raw data layer                                       |
| `libs/editor/`        | Tiptap editor integration — framework component, not a feature                        |
| `libs/feature-shell/` | App shell: layout, navigation, session helpers — owns the wrapper but not the content |

**Decision rule**: if the code knows about a business entity (post, series, publication), it belongs in a feature lib. If it's reusable across multiple features with no business knowledge, it belongs in a non-feature lib.

## Rules

- Routes own form actions; features own data shape
- VMs are the contract: if it's not in the VM, it's not in the UI
- No `any` -- all data flows through typed VMs
- Server functions call services; services call DB docs
