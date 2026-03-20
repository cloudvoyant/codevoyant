---
description: "Use when creating a UX prototype or interactive mockup. Triggers on: \"ux prototype\", \"create prototype\", \"scaffold prototype\", \"build prototype\", \"new prototype\", \"prototype this\". Scaffolds a SvelteKit + Tailwind + shadcn-svelte app with feature-slice architecture. Hard-coded data, fake auth, professional design."
argument-hint: "[prototype-name] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply.

Scaffold a production-quality SvelteKit prototype with feature-slice architecture, shadcn-svelte components, zod validation, fake auth, and a consistent factory pattern.

## Step 0: Parse Args

```
PROTOTYPE_NAME = first non-flag argument
PROTOTYPE_SLUG = slugified PROTOTYPE_NAME (lowercase, hyphens, no special chars)
BG_MODE        = true if --bg present
SILENT         = true if --silent present
```

If `PROTOTYPE_NAME` is absent, ask: "What are we prototyping?"

Slugify: lowercase, replace spaces/underscores with hyphens, strip non-alphanumeric-hyphen chars, collapse consecutive hyphens.

## Step 1: Choose Location

Use **AskUserQuestion**:

```
question: "Where should the prototype live?"
header: "Location"
multiSelect: false
options:
  - label: "In-repo -- single package"
    description: "prototypes/{PROTOTYPE_SLUG}/ at project root -- works when there's one prototype"
  - label: "In-repo -- monorepo (pnpm workspaces)"
    description: "Add as a workspace package; all prototypes share root node_modules"
  - label: "Outside repo"
    description: ".codevoyant/[project]/prototypes/{PROTOTYPE_SLUG}/ -- isolated from main codebase"
```

Derive `PROTOTYPE_DIR` from the answer:

- **Single package**: `prototypes/{PROTOTYPE_SLUG}/`
- **Monorepo**: `prototypes/{PROTOTYPE_SLUG}/` -- additionally, if `pnpm-workspace.yaml` does not already include `prototypes/*`, add it to the workspace packages list.
- **Outside repo**: `.codevoyant/{PROJECT_SLUG}/prototypes/{PROTOTYPE_SLUG}/` where `PROJECT_SLUG` is derived from the current project's directory name.

Record the prototype in `codevoyant.json` (create if it doesn't exist):

```json
{
  "prototypes": [
    {
      "name": "PROTOTYPE_SLUG",
      "path": "PROTOTYPE_DIR",
      "location": "in-repo|out-of-repo",
      "created": "TIMESTAMP"
    }
  ]
}
```

See `references/utils.md` for the codevoyant.json read/write pattern.

## Step 2: Gather Style Direction

If the user has not already described style inspiration, use **AskUserQuestion**:

```
question: "What's the visual style direction for this prototype?"
header: "Style"
multiSelect: false
options:
  - label: "Describe my own direction"
    description: "Free text -- I'll describe the aesthetic"
  - label: "Linear / Vercel"
    description: "Dark, minimal, sharp, monospace accents"
  - label: "Notion / Craft"
    description: "Clean, off-white, rounded, document-like"
  - label: "Stripe / Resend"
    description: "Light, professional, subtle gradients, trustworthy"
  - label: "Shadcn default"
    description: "Neutral, clean slate -- I'll customize later"
```

Store the result as `STYLE_DIRECTION`. This informs color palette, border-radius, and font choices in Step 6.

If user selects "Describe my own direction", ask them to describe the aesthetic in free text.

## Step 3: Gather Feature List

Ask: "What features should this prototype include? List them (e.g. auth, dashboard, settings, blog)."

Parse the response into `FEATURES[]` -- slugify each feature name. These become the feature-slice directories.

Example: "auth, dashboard, settings" becomes `["auth", "dashboard", "settings"]`.

## Step 4: Scaffold SvelteKit

Follow `references/sveltekit-setup-guide.md` for the complete setup procedure.

```bash
cd {parent of PROTOTYPE_DIR}
npx sv create {PROTOTYPE_SLUG} --template minimal --types ts --no-add-ons
```

Install dependencies:

```bash
cd {PROTOTYPE_DIR}
pnpm install
```

Install Tailwind:

```bash
pnpm dlx sv add tailwindcss
```

Install shadcn-svelte:

```bash
pnpm dlx shadcn-svelte@latest init
```

Accept defaults for shadcn-svelte init. This creates `src/lib/components/ui/` and `components.json`.

Install zod:

```bash
pnpm add zod
```

## Step 5: Set Up Feature-Slice Structure

Follow `references/feature-slice-pattern.md` for the full specification.

Create the directory structure:

```bash
mkdir -p src/app
mkdir -p src/libs/layout
mkdir -p src/libs/ui
mkdir -p src/libs/factories
mkdir -p src/libs/validators
for FEATURE in "${FEATURES[@]}"; do
  mkdir -p "src/libs/features/feature-${FEATURE}/{components,view-models,state,actions}"
done
```

Create barrel files (`index.ts`) for each feature and each shared lib directory. Each barrel file exports nothing initially -- it's a placeholder for the public API.

Update `svelte.config.js` to add path aliases:

```js
alias: {
  '$app': './src/app',
  '$libs': './src/libs',
  '$features': './src/libs/features',
  '$ui': './src/libs/ui',
  '$layout': './src/libs/layout',
  '$factories': './src/libs/factories',
  '$validators': './src/libs/validators',
}
```

Create a `README.md` for each feature following the template in `references/feature-slice-pattern.md`.

## Step 6: Configure Theme

Apply theme based on `STYLE_DIRECTION`. Edit `src/app.css` to set CSS custom properties:

- `--color-primary`, `--color-background`, `--color-foreground`, `--color-muted`, `--color-accent`, `--color-border`
- `--radius` (border-radius scale)
- Font family (use a Google Font if appropriate; load via `src/app.html` `<link>` tag)

Configure Tailwind to reference CSS custom properties so utility classes use the theme.

Follow the theming approach in `references/sveltekit-setup-guide.md`.

### Style presets

- **Linear / Vercel**: Dark background (#0a0a0a), sharp corners (radius: 0.25rem), monospace accents (JetBrains Mono), high-contrast text
- **Notion / Craft**: Off-white (#fafafa), generous radius (0.75rem), serif or clean sans-serif (Inter), muted borders
- **Stripe / Resend**: Light (#ffffff), medium radius (0.5rem), professional sans-serif (Inter), subtle gradients and shadows
- **Shadcn default**: Use shadcn-svelte's default theme as-is

## Step 7: Implement Layout First

Before any feature, implement the responsive layout system:

- `src/libs/layout/Container.svelte` -- max-width wrapper with responsive padding
- `src/libs/layout/Stack.svelte` -- vertical flex with configurable gap
- `src/libs/layout/Grid.svelte` -- responsive CSS grid
- `src/libs/layout/Sidebar.svelte` -- collapsible sidebar (if appropriate for the prototype)
- `src/libs/layout/index.ts` -- barrel file exporting all layout components

Then implement the root layout and error page:

- `src/app/+layout.svelte` -- root layout using layout lib components
- `src/app/+error.svelte` -- styled error page

Layout must be responsive from the start. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).

Follow `references/feature-slice-pattern.md` for layout lib conventions.

## Step 8: Implement Features

For each feature in `FEATURES[]`, in order:

1. **Scaffold feature skeleton** -- ensure components/, view-models/, state/, actions/, index.ts, README.md all exist
2. **Write view-model factory** in `src/libs/factories/{feature}.ts` following `references/factory-patterns.md`
3. **Write hard-coded data** -- inline in the feature's `state/` directory or as a mock data file. All mock data must be typed via the entity's zod schema -- no `any`.
4. **Implement routes**:
   - `src/routes/{feature}/+page.server.ts` -- loads data, runs through factory, returns view model
   - `src/routes/{feature}/+page.svelte` -- pure UI, receives view model as prop
5. **Use shadcn-svelte components** for all UI elements. Install as needed:
   ```bash
   pnpm dlx shadcn-svelte@latest add {component}
   ```
6. **Fake auth** (if `auth` is in FEATURES): accept any non-empty email + password; store session in a server-side `Map`; no JWT, no hashing, no database. Provide login/logout routes.

Use Svelte's built-in animation where appropriate (`transition:`, `animate:` directives). Do not add third-party animation libraries.

After each feature: update the feature's `README.md` with component connections and public API.

## Step 9: Validation Pass

```bash
cd {PROTOTYPE_DIR}
pnpm run check   # svelte-check
pnpm run build   # ensure no build errors
```

Fix any type errors or build failures before proceeding.

Start the dev server and report the URL:

```bash
pnpm run dev
```

## Step 10: Report + Notify

Report to user:

```
Prototype scaffolded: {PROTOTYPE_DIR}
  Features: {FEATURES joined by ', '}
  Dev server: pnpm run dev (in {PROTOTYPE_DIR})
  Recorded in codevoyant.json
```

If `BG_MODE=true` and `SILENT=false`, send desktop notification:

```bash
npx @codevoyant/agent-kit notify --title "ux:prototype complete" --message "Prototype '{PROTOTYPE_SLUG}' ready at {PROTOTYPE_DIR}"
```

See `references/utils.md` for the notification pattern.
