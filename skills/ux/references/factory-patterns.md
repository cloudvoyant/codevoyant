# Factory Patterns

Reference for view-model factories, defineContract, and zod validation patterns used in prototypes.

## View-Model Factory

Every entity exposed to UI goes through a factory function. One factory file per feature in `src/libs/factories/`.

```typescript
// src/libs/factories/user.ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

type User = z.infer<typeof UserSchema>;

export function createUserVM(data: unknown) {
  const parsed = UserSchema.parse(data);
  return {
    ...parsed,
    displayName: parsed.name,
    isAdmin: parsed.role === 'admin',
    // Attach schema ref for re-validation at boundaries
    _schema: UserSchema,
    serialize: () => JSON.stringify(parsed),
    validate: (input: unknown) => UserSchema.safeParse(input),
  };
}
```

### Pattern details

- **`_schema`** is always attached so consumers can validate on the way in.
- **`serialize`** returns a JSON string of the validated data.
- **`validate`** runs `safeParse` on arbitrary input and returns a result object.
- Derived fields (like `displayName`, `isAdmin`) are computed in the factory, not in components.
- The factory function accepts `unknown` and validates via zod -- no `any` types.

## defineContract Factory

For backend entities colocated with API routes. Provides a standardized contract for parsing, serializing, and deserializing data.

```typescript
// src/routes/api/posts/contract.ts
import { z } from 'zod';

export function defineContract<T extends z.ZodTypeAny>(schema: T) {
  return {
    schema,
    parse: (data: unknown) => schema.parse(data),
    safeParse: (data: unknown) => schema.safeParse(data),
    serialize: (data: z.infer<T>) => JSON.stringify(data),
    deserialize: (raw: string) => schema.parse(JSON.parse(raw)),
  };
}

const PostSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string(),
  publishedAt: z.string().datetime().nullable(),
});

export const PostContract = defineContract(PostSchema);
export type Post = z.infer<typeof PostSchema>;
```

### Usage in routes

```typescript
// src/routes/api/posts/+server.ts
import { PostContract } from './contract';

export function GET() {
  const posts = getMockPosts();
  return new Response(
    JSON.stringify(posts.map((p) => PostContract.parse(p)))
  );
}
```

## Rules

- Every entity exposed to UI goes through a factory function.
- `_schema` is always attached so consumers can validate on the way in.
- `serialize` / `deserialize` are standardized on all factories.
- Hard-coded mock data is typed via the entity schemas -- no `any`.
- One factory file per feature in `src/libs/factories/`.
- defineContract is used for API route entities; view-model factories are used for page-level data.

## PageState<T> Pattern

Required wrapper for all async page data. Every `+page.svelte` that loads data must use `PageState<T>` to represent the four possible states.

```typescript
// ─── PageState<T>: required wrapper for all async page data ───────────────

export type PageState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry?: () => void }
  | { status: 'empty' }
  | { status: 'ok'; data: T };

// Usage in +page.svelte (Svelte 5 runes):
// let state = $state<PageState<UserVM[]>>({ status: 'loading' });
```

## createEmpty Helpers

Each factory file must export a `createEmpty{Entity}()` function. This is the canonical "empty state" for the entity — used by PageState `'empty'` and as a safe default when optional data is absent.

```typescript
// ─── createEmpty helpers: required export for every entity ────────────────

export function createEmptyUser(): UserVM {
  return {
    id: '',
    name: '',
    email: '',
    role: 'viewer',
    displayName: 'Unknown',
    isAdmin: false,
    _schema: UserSchema,
    serialize: () => '{}',
    validate: (input: unknown) => UserSchema.safeParse(input),
  };
}
```

## Realistic Mock Data

Mocks must include realistic variation. Never use placeholder text like "Lorem ipsum" or "John Doe".

```typescript
// ─── Realistic mock data: required shape ──────────────────────────────────

export const MOCK_USERS: UserVM[] = [
  createUserVM({ id: '1', name: 'Priya Ramaswamy', email: 'priya@example.com', role: 'admin' }),
  createUserVM({ id: '2', name: 'Ben', email: 'ben@example.com', role: 'viewer' }),
  createUserVM({ id: '3', name: 'Aleksandra Wojciechowska-Kowalski', email: 'aleksandra@long-domain-example.com', role: 'member' }),
  // Include at least 5 items; mix short/long names, diverse email domains
];
```
