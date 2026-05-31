# Recipe: ZodObject\<ZodRawShape\> instead of ZodObject\<any\>

## Problem

Functions that accept a Zod object schema often use `ZodObject<any>` as the parameter type because `ZodObject` requires a generic parameter. `ZodObject<any>` compiles but throws away all information about the schema's shape.

## Correct Fix

Zod exports `ZodRawShape` — the correct bound for a Zod object's shape parameter. Use it directly, or use a generic with that bound to preserve the shape type.

```ts
// ✗ Loses shape information:
function createCollection(schema: ZodObject<any>) { ... }

// ✓ Option A — use ZodRawShape bound directly (shape is still unknown but valid):
import { type ZodRawShape, ZodObject } from 'zod';
function createCollection(schema: ZodObject<ZodRawShape>) { ... }

// ✓ Option B — generic to preserve the shape type through the function:
function createCollection<T extends ZodRawShape>(schema: ZodObject<T>) { ... }

// For the most general "any Zod type" (not just objects), use ZodTypeAny:
import { type ZodTypeAny } from 'zod';
function validate(schema: ZodTypeAny, data: unknown) { ... }
```

## Why

`ZodObject<any>` and `ZodObject<ZodRawShape>` are both "any object schema" at runtime, but `ZodRawShape` signals intent to other developers and to TypeScript. With the generic form (Option B), TypeScript can infer the schema's shape and carry it through — useful when the return type depends on the schema (e.g. `z.infer<T>`).

## See Also

- `typescript/use-library-types` — the general principle this is an instance of
