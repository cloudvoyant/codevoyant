# Recipe: Always call ViewModel.parse() in services

## Problem

Services that build return objects inline (with `as never` casts, `as any`, or manual object construction) bypass Zod validation and produce inferred types that drift from the view-model schema.

## Wrong Fix

```ts
// In publicationService.getPublicationPage:
return {
  id: doc.id,
  title: doc.data().title as never, // ✗ bypasses validation, type unsound
  ...
};
```

## Correct Fix

Every service function that produces a view-model result must call `ViewModel.parse()`:

```ts
// In publicationService.getPublicationPage:
const serialized = PublicationDoc.serialize(doc);
return PublicationPageViewModel.parse(serialized); // ✓ validated + typed
```

The return type is then inferred as `PublicationPage` from the Zod schema — no explicit annotation needed, and the schema is the single source of truth.

## Why

The `defineViewModel` factory's `.parse()` method validates at runtime and produces a TypeScript type from the Zod schema. Inline construction with casts produces the same shape but without runtime validation or a single source of truth for the type. When the schema evolves, inline constructions silently go out of date.

The pattern established by `seriesService`, `feedService`, and `dashboardService` is:

```ts
ViewModel.parse(DocumentClass.serialize(firestoreDoc));
```

Follow it consistently.

## See Also

- `feature-lib-forms.md` — same principle applied to form action returns
