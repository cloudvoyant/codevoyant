# Data Transformation with View Models

## Why this matters

Every service function that fetches data from the DB should return a view model — not a raw document, not an inline-constructed object, not a type-cast guess. The view model is the contract between your data layer and your UI, and Zod's `.parse()` is what enforces it.

When developers skip this and construct return objects inline — using `as never`, `as any`, or manual property mapping — two things happen:
1. **Runtime validation disappears.** If the DB returns a field as `null` but the UI expects a string, you get a silent `undefined` deep in a component instead of an error at the service boundary where you can handle it.
2. **Types drift from reality.** The TypeScript type says one thing, the actual runtime value is another. Refactoring becomes guesswork.

The fix is always the same: call `ViewModelSchema.parse()` at the end of every service function.


## What goes wrong: inline construction

```ts
// In publicationService.getPublicationPage:
return {
  id: doc.id,
  title: doc.data().title as never,  // cast silences TypeScript but doesn't validate
  // ...
};
```

Problems with this:
- The `as never` cast tells TypeScript "trust me, this is fine" — but TypeScript doesn't actually check the shape
- When the schema changes, this inline construction is silently out of date
- No runtime validation: if the DB returns `null` for `title`, the bug surfaces in the component


## The correct pattern: always call `.parse()`

```ts
// In publicationService.getPublicationPage:
const serialized = PublicationDoc.serialize(doc);
return PublicationPageViewModel.parse(serialized);  // validated + typed
```

The return type is inferred from the Zod schema — no manual type annotation needed. The schema is the single source of truth: it validates at runtime AND generates the TypeScript type.


## The full service pattern

```ts
// libs/feature-publication/src/services/publication.ts
export const publicationService = defineService({ PublicationDoc }, ({ PublicationDoc }) => ({
  async getPublicationPage(handle: string): Promise<PublicationPageViewModel> {
    const doc = await PublicationDoc.findByHandle(handle);
    const serialized = PublicationDoc.serialize(doc);
    return PublicationPageViewModel.parse(serialized);  // ✓ validated + typed
  },
}));
```

And the view model it parses against:

```ts
// libs/feature-publication/src/view-models/publication.ts
import { z } from "zod";

export const PublicationPageViewModelSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  // Only fields the UI renders — not the full DB document
});
export type PublicationPageViewModel = z.infer<typeof PublicationPageViewModelSchema>;

// Named export for .parse() calls
export const PublicationPageViewModel = PublicationPageViewModelSchema;
```


## What `.parse()` gives you

1. **Runtime validation**: if the DB data doesn't match the schema, you get a clear Zod error at the service boundary — not a mysterious `undefined` in a component
2. **Type inference**: the return type is derived from the schema, not declared separately — they can't drift apart
3. **Single source of truth**: to add a field to the UI, add it to the schema → update the service to populate it → use it in the component. The schema drives everything.


## Adding a new field to the UI

The workflow for adding a field follows the schema:

1. Add the field to the view model Zod schema
2. Update the service to populate the field (from the DB document or a related document)
3. Use the field in the component

Do not start from the component and work backward. Start from the schema.


## See also

- `feature-lib-forms.md` — same principle applied to form action returns
- `form-result-type.md` — `satisfies` operator for type-checking action return shapes
