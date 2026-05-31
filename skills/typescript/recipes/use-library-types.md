# Recipe: Use library-exported utility types instead of casting to `any`

## Problem

When a TypeScript library API rejects your type, the tempting fix is `as any`. This compiles but discards all type safety and hides the actual constraint. Almost every well-typed library exports utility types that describe exactly what it accepts — find and use those instead.

## Pattern

1. Read the error message — it names the expected type.
2. Look in the library's type definitions or docs for that type.
3. Import it and use it. If the match isn't exact, use a localized cast as close to the mismatch as possible rather than `as any` at the call site.

## Examples

### Firestore — UpdateData\<T\> and WithFieldValue\<T\>

```ts
// ✗ Firestore rejects Partial<Series>, so we cast to any:
const updates: any = {};
updates.title = newTitle;
await updateDoc(ref, updates);

collection.add(doc as any);

// ✓ Use Firestore's own utility types:
import type { UpdateData, WithFieldValue } from "firebase/firestore";

const updates: UpdateData<Series> = { title: newTitle };
// For dynamic key writes, localize the cast to the loop — not the whole object:
(updates as Record<string, unknown>)[dynamicKey] = value;
await updateDoc(ref, updates);

collection.add(doc as WithFieldValue<Series>); // honest — names the constraint
```

### Tiptap — SuggestionProps\<Item\>

```ts
// ✗ Suggestion render callbacks typed as any:
render: () => ({
  onStart: (props: any) => { ... },
})

// ✓ @tiptap/suggestion exports the full callback type:
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

interface MentionItem { id: string; label: string; handle: string; }

render: () => ({
  onStart: (props: SuggestionProps<MentionItem>) => { ... },
  onKeyDown: (props: SuggestionKeyDownProps) => boolean { ... },
})
```

### Tiptap — custom commands via module augmentation (not `as any`)

```ts
// ✗ editor.commands as any to call custom command:
(editor.commands as any).insertMention({ id, label });

// ✓ Declare the command in the module:
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: { insertMention: (attrs: MentionAttrs) => ReturnType };
  }
}
editor.commands.insertMention({ id, label }); // typed, no cast
```

## Why

`as any` solves the immediate compile error but defeats the point of TypeScript — the next developer (or AI) has no idea what shape the value is. Library utility types like `UpdateData<T>`, `WithFieldValue<T>`, and `SuggestionProps<Item>` are designed precisely to express "this type, but augmented for our API". Using them keeps the type information intact and documents the relationship to the library.

## See Also

- `typescript/zod-generic-bounds` — same principle applied to Zod schema types
- `typescript/unknown-catch` — same localized-cast discipline for error handling
