# Client State Management with Zustand

## Why this matters

Not all state is the same kind of problem. **Server state** (data fetched from an API) has its own lifecycle: it goes stale, needs caching, can be refetched. TanStack Query handles that. **Client/UI state** (is the sidebar collapsed? what theme is active? what is this editor session's current upload ID?) has no server lifecycle — it belongs to the user's interaction with the interface.

Zustand is chosen for client/UI state because:
- It has no boilerplate: you define state and actions in one place.
- Selectors are granular: a component that reads `theme` only re-renders when `theme` changes — not when any unrelated state changes.
- Middleware (`persist`, `immer`, `devtools`) compose cleanly without requiring a different mental model.

**Two problems Zustand solves that React `useState` can't:**
1. State that must survive component unmounts (sidebar collapse, scroll position, theme preference).
2. State shared between distant parts of the tree, without lifting it all the way up to `App.tsx` and prop-drilling it down.

```bash
pnpm add zustand immer
```


## Pattern 1 — Global singleton store with `create` + persist

Use this for **app-wide UI state** that should survive page navigations and optionally browser refreshes: theme preference, sidebar visibility, user preferences.

`src/shared/stores/use-theme-store.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "theme-storage" },
  ),
);
```

Consume anywhere with a **narrow selector** — only subscribe to the slice of state you actually need:

```ts
// Only re-renders when `theme` changes — not when any other store value changes
const theme = useThemeStore((s) => s.theme);
const setTheme = useThemeStore((s) => s.setTheme);
```

**Why the double-call curried form `create<ThemeStore>()(...)` ?**  
When you add middleware like `persist` or `immer`, TypeScript can't infer the full generic chain from a single call. The curried form `create<T>()` lets TypeScript first bind the state type, then apply the middleware, keeping the types correct throughout.


## Pattern 2 — Per-instance store via context

Use this for **state scoped to a specific entity or subtree** — an editor session, a modal instance, a drag-and-drop zone. If you used a global singleton here, two instances of the same component would clobber each other's state.

The pattern: a factory creates one store instance per entity ID, a React Context holds it, and a typed selector hook reads it.

`src/features/editor/stores/use-editor-session.ts`:

```ts
import { createContext, use } from "react";

import { createStore, useStore } from "zustand";
import { devtools, persist, type StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// 1. Split state and actions — intersect into the store type.
//    This separation makes it easy to partialize persist (state only, never actions).
export type EditorSessionState = {
  sessionId: string;
  uploadId: string;
  fileName: string | null;
  hasArtifacts: boolean;
};

export type EditorSessionActions = {
  setEditorSession: (
    values: Pick<
      EditorSessionState,
      "sessionId" | "uploadId" | "hasArtifacts" | "fileName"
    >,
  ) => void;
  setHasArtifacts: (hasArtifacts: boolean) => void;
  reset: (uploadId: string) => void;
};

export type EditorSessionStore = EditorSessionState & EditorSessionActions;

// 2. Default-state factory — extracted so `reset()` can reuse it.
export function createDefaultEditorSessionState(
  sessionId: string,
  uploadId?: string,
): EditorSessionState {
  return {
    sessionId,
    uploadId: uploadId ?? crypto.randomUUID(),
    fileName: null,
    hasArtifacts: false,
  };
}

// 3. Factory that builds one store instance per sessionId.
export function createEditorSessionStore(sessionId: string) {
  // Guard: clear stale persisted state that belongs to a different entity.
  // Without this, navigating from session A to session B would load session A's data.
  try {
    const item = localStorage.getItem("editor.session") || "";
    const state = JSON.parse(item) as StorageValue<EditorSessionState>;
    if (state.state.sessionId !== sessionId) {
      localStorage.removeItem("editor.session");
    }
  } catch {
    localStorage.removeItem("editor.session");
  }

  return createStore<EditorSessionStore>()(
    devtools(
      persist(
        immer((set) => ({
          ...createDefaultEditorSessionState(sessionId),
          setEditorSession: (editorSession) =>
            set((state) => {
              state.sessionId = editorSession.sessionId;
              state.uploadId = editorSession.uploadId;
              state.fileName = editorSession.fileName;
              state.hasArtifacts = editorSession.hasArtifacts;
            }),
          setHasArtifacts: (hasArtifacts) =>
            set((state) => {
              state.hasArtifacts = hasArtifacts;
            }),
          reset: (uploadId) =>
            set(() => createDefaultEditorSessionState(sessionId, uploadId)),
        })),
        {
          name: "editor.session",
          // Persist only state, never actions — actions are recreated from the factory.
          partialize: (state): EditorSessionState => ({
            sessionId: state.sessionId,
            uploadId: state.uploadId,
            fileName: state.fileName,
            hasArtifacts: state.hasArtifacts,
          }),
        },
      ),
      { name: `editor-session-${sessionId}` },
    ),
  );
}

// 4. A context holds one store instance.
export const EditorSessionContext = createContext<
  ReturnType<typeof createEditorSessionStore>
>(null!);

// 5. Typed selector hook — throws if the provider is missing (not silently returns undefined).
export function useEditorSession<T>(
  selector: (state: EditorSessionStore) => T,
): T {
  const store = use(EditorSessionContext);
  if (!store) throw new Error("Missing EditorSessionContext.Provider in the tree");
  return useStore(store, selector);
}
```

The provider creates the store once via `useState` initializer (so it's only built once per mount) and renders the context. `src/features/editor/stores/editor-session-provider.tsx`:

```tsx
import { useState } from "react";

import {
  createEditorSessionStore,
  EditorSessionContext,
} from "./use-editor-session";

export function EditorSessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createEditorSessionStore(sessionId));
  return (
    <EditorSessionContext value={store}>{children}</EditorSessionContext>
  );
}
```

Consume with a narrow selector:

```ts
const fileName = useEditorSession((s) => s.fileName);
const setHasArtifacts = useEditorSession((s) => s.setHasArtifacts);
```


## Conventions checklist

Copy these patterns in every new store:

- **Split `…State` and `…Actions` types** — intersect into `…Store`. This makes the `partialize` option type-safe (persist only `…State`).
- **`createDefault…State()` factory** — extracted so `reset()` can call it, and tests can build initial state without a full store.
- **`immer` middleware** — actions mutate draft state directly (Immer handles immutability). No need for spread operators.
- **`persist` with explicit `partialize`** — persists only state, never actions. Actions are always recreated by the factory.
- **Stale-state guard in the factory** — before restoring persisted state, check the entity ID matches. Clear it if not.
- **`devtools` as the outermost wrapper** — wrapping `persist` means Redux DevTools shows named actions. Give each instance a unique `name`.
- **Throw in the selector hook if no provider** — fail fast with a clear message rather than silently returning undefined.


## Verify

```bash
pnpm run typecheck
```

Render two `EditorSessionProvider`s with different `sessionId`s. Confirm their state is independent — changing `hasArtifacts` in one provider should not affect the other.
