---
title: typescript
---

# typescript

Context skill for TypeScript type safety patterns. Activates automatically when `.ts`, `.tsx`, or `tsconfig.json` files are detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're working in a TypeScript codebase the agent loads patterns for common type safety problems before generating or reviewing code: safe error handling, using library-provided types instead of casting, and authoring generic functions that accept Zod schemas.

## Recipes

| Working on… | Recipe loaded |
|---|---|
| Error handling in a `catch` block | `unknown-catch` |
| A library API rejecting your type | `use-library-types` |
| A function that accepts a Zod schema | `zod-generic-bounds` |

## Key Patterns

### Unknown in catch blocks

```typescript
// ✅ Narrow before using
try {
  await riskyOp();
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}

// ❌ Casting hides real errors
} catch (err) {
  console.error((err as Error).message);
}
```

### Use library types instead of casting

```typescript
// ✅ Use what the library exports
import type { User } from '@supabase/supabase-js';
function greet(user: User) { ... }

// ❌ Casting away type safety
function greet(user: any) { ... }
```

### Zod generic bounds

```typescript
import { z } from 'zod';

function parseWith<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}
```

## Configuration

Projects should use `strict: true` in `tsconfig.json`. The skill enforces strict-mode compatible patterns throughout.
