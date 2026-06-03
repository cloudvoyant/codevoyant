# Async State with TanStack Query and Forms

## Why this matters

Most React apps have two recurring problems: managing server state (data that lives on the server and needs to stay in sync) and form state (user input that needs to be validated and submitted). These are not the same problem, and conflating them leads to messy components full of `useState`, manual loading flags, and error strings.

TanStack Query solves the server state problem by treating remote data as a cache entry with a defined lifecycle — it knows when data is stale, refetches automatically, deduplicates concurrent requests, and gives you deterministic loading/error/success states. TanStack Form solves the form state problem with fine-grained field-level subscriptions, so changing one field does not re-render every other field.

The recipe in `router.md` shows how loaders prefetch data before components render. This recipe shows the other half: how components read from that cache and how forms submit changes back.

What goes wrong without these patterns:
- Using `useQuery` where a loader already called `ensureQueryData` — you need `useSuspenseQuery` or you will see an unnecessary pending state
- Forgetting `initialPageParam` in `useInfiniteQuery` v5 — TypeScript will not catch this at compile time but the query will break at runtime
- Writing async form validators with `onChange` instead of `onChangeAsync` — TypeScript silently drops the promise return type and the validator never awaits
- Not returning rollback context from `onMutate` — `onError` cannot restore the optimistic update

## 1. `useQuery` + `queryOptions`

Define reusable `queryOptions` factories with typed `as const` key hierarchies. The same factory is used by the loader (`ensureQueryData`) and the component (`useQuery` or `useSuspenseQuery`), ensuring the cache key always matches.

```ts
// src/queries/posts.ts
import { queryOptions } from "@tanstack/react-query";

export const postsKeys = {
  all:    ["posts"] as const,
  list:   (filter: string) => [...postsKeys.all, "list", filter] as const,
  detail: (id: string)     => [...postsKeys.all, "detail", id] as const,
};

export const postsQuery = (filter: string) => queryOptions({
  queryKey: postsKeys.list(filter),
  queryFn:  () => api.posts.list({ filter }),
  staleTime: 60_000,
});

export const postQuery = (id: string) => queryOptions({
  queryKey: postsKeys.detail(id),
  queryFn:  () => api.posts.get(id),
});
```

```tsx
const { data, isPending, error } = useQuery(postsQuery("published"));
```

v5 rename: `isPending` replaces `isLoading`; `status` is `"pending" | "error" | "success"`. The string `"loading"` no longer exists.

When a loader already prefetched with `ensureQueryData(postQuery(id))`, use `useSuspenseQuery` in the component instead — it returns data synchronously with no `isPending` branch to handle:

```tsx
function PostPage() {
  const { postId } = Route.useParams();
  const { data } = useSuspenseQuery(postQuery(postId));   // synchronous — loader filled the cache
  return <article>{data.body}</article>;
}
```

Only use `useSuspenseQuery` when a loader has prefetched the same `queryOptions`. If the loader has not run (e.g. the component is rendered outside a route context), `useSuspenseQuery` will suspend indefinitely without a Suspense boundary to catch it.

## 2. `useMutation` with invalidation + optimistic update

Mutations have a lifecycle: `onMutate` fires before the request (use it for optimistic updates), `onError` fires on failure (use it to roll back), and `onSettled` fires after success or failure (use it to invalidate and refetch).

Always return rollback context from `onMutate`. Without it, `onError` has no reference to what to restore.

```tsx
const qc = useQueryClient();

const createPost = useMutation({
  mutationFn: api.posts.create,
  onMutate: async (newPost) => {
    await qc.cancelQueries({ queryKey: postsKeys.list("all") });
    const prev = qc.getQueryData(postsKeys.list("all"));
    qc.setQueryData(postsKeys.list("all"), (old: any) => [...old, newPost]);
    return { prev };                           // rollback context returned here
  },
  onError: (_e, _v, ctx) => qc.setQueryData(postsKeys.list("all"), ctx?.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: postsKeys.list("all") }),
  onSuccess: () => qc.invalidateQueries({ queryKey: postsKeys.all }),
});

createPost.mutate({ title: "hi" });
```

## 3. Invalidation strategies

Match the right granularity to the operation. Invalidating too broadly causes unnecessary refetches; invalidating too narrowly leaves stale data in the cache.

```ts
// Invalidate everything in the "posts" subtree (prefix match — most common after mutations)
qc.invalidateQueries({ queryKey: postsKeys.all });

// Invalidate exactly one specific query (use when you know only one key changed)
qc.invalidateQueries({ queryKey: postsKeys.list("all"), exact: true });

// Predicate-based — use when keys encode tenant or user data and you need to invalidate selectively
qc.invalidateQueries({
  predicate: (q) => q.queryKey[0] === "posts" && q.state.data?.userId === 1,
});
```

## 4. `useInfiniteQuery`

Infinite queries load paginated data by appending new pages to a flat list. The major v5 change is that `initialPageParam` is now **required** — omitting it is a runtime error.

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => api.feed.page({ cursor: pageParam }),
    initialPageParam: null as string | null,                  // required in v5
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

const items = data?.pages.flatMap((p) => p.items) ?? [];
```

v5: `getNextPageParam` receives `(lastPage, allPages, lastPageParam, allPageParams)` — the full context is available for complex cursor strategies.

## 5. TanStack Form — install

```bash
pnpm add @tanstack/react-form zod
```

## 6. Form with Zod validator (sync)

Pass the Zod schema directly to `validators.onChange`. TanStack Form calls it on every change and surfaces errors per-field through `field.state.meta.errors`. Use `<form.Field>` with a render prop so only the fields that change re-render, not the whole form.

Start with this minimal shape, then add async validators and server-side validation as needed.

```tsx
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email(),
  age:      z.number().int().gte(13, "Must be 13+"),
  password: z.string().min(8),
});

function SignupForm() {
  const form = useForm({
    defaultValues: { email: "", age: 0, password: "" },
    validators: { onChange: schema },               // Zod schema passed directly
    onSubmit: async ({ value }) => api.signup(value),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="email">
        {(field) => (
          <label>
            email
            <input
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {!field.state.meta.isValid && (
              <em role="alert">{field.state.meta.errors.join(", ")}</em>
            )}
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? "..." : "sign up"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
```

## 7. Async field validation (debounced)

Async validators check a value against the server — for example, whether an email is already taken. Use `onChangeAsync` (not `onChange`) for any validator that returns a Promise. TypeScript will not warn you if you use `onChange` for an async function — it silently drops the promise return type and the validator never actually awaits.

`asyncDebounceMs` prevents a server request on every keystroke.

```tsx
<form.Field
  name="email"
  asyncDebounceMs={400}
  validators={{
    onChangeAsync: async ({ value }) => {
      const taken = await api.users.isEmailTaken(value);
      return taken ? "Email already in use" : undefined;
    },
  }}
>
  {(field) => (
    <input value={field.state.value}
           onChange={(e) => field.handleChange(e.target.value)} />
  )}
</form.Field>
```

Sync validator runs first; async only fires if sync passes. Use both together: sync for format, async for uniqueness.

## 8. Server-side form validation (`onSubmitAsync`)

When the server returns per-field validation errors, map them back to field paths. Nested keys use dot notation (`"details.email"`). Returning a non-null value from `onSubmitAsync` prevents the form's `onSubmit` from firing.

```tsx
const form = useForm({
  defaultValues: { age: 0, details: { email: "" } },
  validators: {
    onSubmitAsync: async ({ value }) => {
      const res = await api.validate(value);
      if (!res.ok) {
        return {
          form: "Invalid data",
          fields: {
            age: res.errors.age,
            "details.email": res.errors.email,
          },
        };
      }
      return null;
    },
  },
});
```

## 9. Array fields

Use `mode="array"` on the parent field, then nest child fields by index. `field.pushValue` appends a new entry. This renders a separate field subscription per entry, so editing one item does not re-render the others.

```tsx
<form.Field name="socials" mode="array">
  {(field) => (
    <>
      {field.state.value.map((_, i) => (
        <form.Field key={i} name={`socials[${i}].url`}>
          {(sub) => (
            <input value={sub.state.value}
                   onChange={(e) => sub.handleChange(e.target.value)} />
          )}
        </form.Field>
      ))}
      <button type="button" onClick={() => field.pushValue({ url: "" })}>
        add social
      </button>
    </>
  )}
</form.Field>
```

## 10. Form + Query: typical edit flow

The complete pattern for editing an existing record: load with `useSuspenseQuery`, mutate with `useMutation`, initialize form from query data, submit via `update.mutateAsync`. On success, update the cache entry directly (`setQueryData`) for instant UI, then invalidate the list so it also gets fresh data.

```tsx
function PostEditor({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const { data: post } = useSuspenseQuery(postQuery(postId));

  const update = useMutation({
    mutationFn: api.posts.update,
    onSuccess: (saved) => {
      qc.setQueryData(postsKeys.detail(postId), saved);     // instant local update
      qc.invalidateQueries({ queryKey: postsKeys.all });    // refresh list views
    },
  });

  const form = useForm({
    defaultValues: { title: post.title, body: post.body },
    validators: {
      onChange: z.object({ title: z.string().min(1), body: z.string() }),
    },
    onSubmit: ({ value }) => update.mutateAsync({ id: postId, ...value }),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="title">
        {(f) => <input value={f.state.value}
                       onChange={(e) => f.handleChange(e.target.value)} />}
      </form.Field>
      <form.Field name="body">
        {(f) => <textarea value={f.state.value}
                          onChange={(e) => f.handleChange(e.target.value)} />}
      </form.Field>
      <button type="submit" disabled={update.isPending}>save</button>
    </form>
  );
}
```

## Common pitfalls

- `useSuspenseQuery` in components only when a loader prefetched the same `queryOptions` — otherwise it suspends without a fallback
- Always pair `useInfiniteQuery` with `initialPageParam` (v5 requirement — omitting it is a silent runtime error)
- TanStack Form async validators must end in `Async` — `onChangeAsync`, `onSubmitAsync`, `onBlurAsync` — never `onChange` for async functions
- `field.state.meta.errors` is always a string array; join when rendering: `errors.join(", ")`
- Mutation `onMutate` MUST return rollback context for `onError` to use it
