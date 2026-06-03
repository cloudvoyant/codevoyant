# TypeScript Conventions: Strict Mode, Type Safety, and Error Handling

## Why this matters

`strict: true` in `tsconfig.json` is not a style preference — it catches entire classes of bugs at compile time that would only surface as runtime crashes in production. But enabling strict mode without understanding its conventions leads to a common escape hatch: `as any`. Every `as any` is a hole in the type system where runtime errors can hide. This recipe is about closing those holes using patterns the TypeScript compiler can verify.

The three conventions here — using `unknown` in catch blocks, using library utility types instead of casting, and typing Zod schemas correctly — are the most common places where developers reach for `as any` unnecessarily. They each have a better alternative.


## 1. `tsconfig.json` baseline

See the [TypeScript strict mode docs](https://www.typescriptlang.org/tsconfig#strict) for what `strict` enables. We also add two flags that aren't in `strict` but catch real bugs:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noUncheckedIndexedAccess": true,    // array[i] is T | undefined — catches off-by-one bugs
    "exactOptionalPropertyTypes": true   // {a?: string} means string, not string | undefined
  }
}
```

`noUncheckedIndexedAccess` is the one we've found catches the most real bugs. The "I assumed the array was non-empty" mistake surfaces as a compile error instead of a `Cannot read properties of undefined` at runtime.


## 2. Error handling: `unknown` in catch blocks

### The problem

`catch (err: any)` disables type safety in the catch block. Accessing `err.message` directly compiles but throws at runtime if `err` is anything other than an `Error` (a string, a number, a rejected Promise value — all valid throw values in JavaScript).

```ts
// Wrong — compiles, unsafe at runtime
catch (err: any) {
  logger.error(err.message); // throws if err is not an Error
}
```

### The correct pattern

`unknown` forces you to narrow the type before accessing properties. The check is one line:

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ error: err }, message);
}
```

### When to catch at all

Only catch at system boundaries — API handlers, server startup hooks, background job runners. At those boundaries the error could come from anywhere (library code, network, user input), so `unknown` is the correct type. Inside business logic, let errors propagate: the boundary will catch them.

```ts
// API handler — system boundary, catch here
app.get("/users/:id", async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Business logic — let errors propagate, don't catch here
async function getUser(id: string): Promise<User> {
  const row = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  if (!row) throw new Error(`User ${id} not found`);
  return row;
}
```


## 3. Avoid `as any`: use library utility types

### The problem

When a library API rejects your type, the tempting fix is `as any`. This compiles but discards all type safety and leaves no documentation of what the library actually expected.

```ts
// Wrong — silently discards type information
await updateDoc(ref, updates as any);
collection.add(doc as any);
```

### The pattern

Almost every well-typed library exports utility types that describe exactly what it accepts. Read the error message — it names the expected type. Look in the library's type definitions for that type. Import and use it.

```ts
// Firestore — use its own utility types instead of casting
import type { UpdateData, WithFieldValue } from "firebase/firestore";

const updates: UpdateData<Series> = { title: newTitle };
await updateDoc(ref, updates); // typed, no cast

collection.add(doc as WithFieldValue<Series>); // honest — names the constraint
```

```ts
// Tiptap — import the callback type instead of using any
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

interface MentionItem { id: string; label: string; handle: string; }

render: () => ({
  onStart: (props: SuggestionProps<MentionItem>) => { ... },
  onKeyDown: (props: SuggestionKeyDownProps) => boolean { ... },
})
```

### Module augmentation instead of casting commands

When a library has an extensible type (like Tiptap's `Commands`), augment the module declaration instead of casting:

```ts
// Wrong — casts away the type system
(editor.commands as any).insertMention({ id, label });

// Correct — augments the module so the command is typed everywhere
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: { insertMention: (attrs: MentionAttrs) => ReturnType };
  }
}
editor.commands.insertMention({ id, label }); // fully typed
```

### When a cast is unavoidable

Localize it as tightly as possible — cast the specific value at the specific mismatch, not the container:

```ts
// Wide cast — loses type information for the whole object
const updates: any = {};
updates[dynamicKey] = value;

// Localized cast — only the dynamic key write is untyped, the rest stays typed
const updates: UpdateData<Series> = {};
(updates as Record<string, unknown>)[dynamicKey] = value;
```


## 4. Typing Zod schemas as parameters

### The problem

Functions that accept a Zod object schema often use `ZodObject<any>` as the parameter type because `ZodObject` requires a generic. `ZodObject<any>` compiles but discards the schema's shape information.

```ts
// Wrong — loses shape information, breaks inference
function createCollection(schema: ZodObject<any>) { ... }
```

### Two correct options

```ts
import { type ZodRawShape, ZodObject, type ZodTypeAny } from "zod";

// Option A: ZodRawShape bound — accepts any valid object schema, shape is unknown but the parameter is safe
function createCollection(schema: ZodObject<ZodRawShape>) { ... }

// Option B: generic — preserves the shape through the function, enabling inference on return types
function createCollection<T extends ZodRawShape>(schema: ZodObject<T>) {
  // TypeScript can now infer the return type based on T
  type Output = z.infer<ZodObject<T>>;
}

// For "any Zod type" (not just objects): ZodTypeAny
function validate(schema: ZodTypeAny, data: unknown) { ... }
```

Use Option B (generic) when the return type or behavior depends on the schema's shape. Use Option A when you only need to call `schema.parse()` and don't need to infer the output type.


## 5. Naming conventions

### Files and directories

- `kebab-case` for files and directories: `user-profile.ts`, `auth-service/`
- `PascalCase` for React component files: `UserProfile.tsx`
- Test files colocated or in a sibling `tests/` directory: `user-profile.test.ts`

### TypeScript identifiers

- `PascalCase` for types, interfaces, classes, enums: `type UserProfile`, `interface ApiResponse<T>`
- `camelCase` for variables, functions, methods: `getUserById`, `parseResponse`
- `SCREAMING_SNAKE_CASE` for true constants (values that never change at runtime): `const MAX_RETRIES = 3`
- Prefer `type` over `interface` for object shapes that don't need declaration merging

### Prefer `type` imports for type-only imports

```ts
// Correct — explicit type-only import
import type { User, ApiResponse } from "./types";
import { parseUser } from "./parsers";

// Avoid — mixing type and value imports without the `type` qualifier
import { User, parseUser } from "./module"; // is User a type or a value?
```

`import type` is stripped at compile time with no runtime cost, and it makes the intent explicit.


## 6. Avoiding common `strict: true` pitfalls

### `noUncheckedIndexedAccess` — index access returns `T | undefined`

```ts
const items = ["a", "b", "c"];

// Wrong — strict mode: items[0] is string | undefined, not string
const first = items[0].toUpperCase(); // error: possibly undefined

// Correct — guard first
const first = items[0];
if (first !== undefined) {
  first.toUpperCase();
}

// Or use find/at with explicit undefined handling
const first = items.at(0) ?? "";
```

### Discriminated unions instead of optional chaining chains

Deeply optional types (`user?.profile?.avatar?.url`) suggest the data model should use discriminated unions instead:

```ts
// Fragile — each ? hides whether the absence is expected or a bug
const url = user?.profile?.avatar?.url;

// Better — explicit states make absence intentional and exhaustive
type User =
  | { status: "active"; profile: UserProfile }
  | { status: "pending"; profile: null };

// TypeScript narrows correctly in each branch
if (user.status === "active") {
  const url = user.profile.avatar.url; // no optional chaining needed
}
```

### Use `satisfies` to get both inference and validation

```ts
// as const + satisfies: infer the narrow type while validating against the shape
const config = {
  env: "production",
  port: 3000,
} satisfies AppConfig;

// config.env is "production" (narrow), not string (wide) — and it's validated against AppConfig
```


## Summary: the decision tree for type errors

1. **Library API rejects your type** → look for the library's utility type (see section 3)
2. **Error handling in a catch block** → use `unknown`, narrow with `instanceof Error` (see section 2)
3. **Function accepting a Zod schema** → use `ZodRawShape` or a generic (see section 4)
4. **Index access might be undefined** → guard with a conditional or use `.at()` with a fallback
5. **Cast is unavoidable** → localize it as tightly as possible, add a comment explaining why

If none of these apply and you're reaching for `as any`, pause and ask: is the type wrong, or is the code wrong?
