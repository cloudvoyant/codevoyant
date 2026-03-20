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
