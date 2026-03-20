# Feature-Slice Architecture Pattern

Canonical reference for the feature-slice directory layout, barrel files, naming rules, and layout lib conventions.

## Directory Structure

```
src/
  app/
    +layout.svelte        <- root layout
    +error.svelte
    hooks.server.ts       <- server hooks (session, auth guard)
  libs/
    features/
      feature-{name}/
        components/       <- UI components scoped to this feature
        view-models/      <- TypeScript types for data shapes passed to components
        state/            <- Svelte stores or rune-based state
        actions/          <- +page.server.ts form actions and mutations
        index.ts          <- PUBLIC API ONLY -- re-export from here
        README.md         <- component connections and public API description
    ui/                   <- shared dumb components (Button, Badge, Card wrappers)
    layout/               <- responsive layout: Container, Stack, Grid, Sidebar
    factories/            <- view-model factory functions (one file per feature)
    validators/           <- zod schemas shared across features
```

## Rules

### Barrel files (index.ts)

- Every feature directory has an `index.ts` that serves as its **public API**.
- Export ONLY what other features or routes need. Everything else is private to the feature.
- Other features and routes import exclusively from the barrel file:
  ```ts
  // GOOD
  import { UserCard, type UserVM } from '$features/feature-auth';

  // BAD -- reaching into internals
  import UserCard from '$features/feature-auth/components/AuthUserCard.svelte';
  ```

### Component naming

- Components inside `feature-{name}/components/` are named `{FeatureName}{ComponentName}.svelte`.
- This avoids collisions when multiple features have similarly named components.
- Examples:
  - `feature-auth/components/AuthLoginForm.svelte`
  - `feature-auth/components/AuthUserCard.svelte`
  - `feature-dashboard/components/DashboardMetricCard.svelte`
  - `feature-dashboard/components/DashboardActivityFeed.svelte`

### View models

- View models are plain TypeScript interfaces.
- They are created by factory functions in `libs/factories/` (see `factory-patterns.md`).
- View model types live in `feature-{name}/view-models/` and are re-exported via the barrel file.
- Routes receive view models from `+page.server.ts` and pass them to `+page.svelte` as props.

### State management

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) for new code.
- Svelte stores are acceptable for shared cross-component state.
- State files live in `feature-{name}/state/`.
- State is private to the feature unless explicitly exported via the barrel file.

### Actions

- `actions/` contains only server-side logic.
- Never import client-only modules (like browser APIs or Svelte stores) in action files.
- Actions are used by `+page.server.ts` form actions and server-side mutations.

### Layout lib

- Layout components accept **only layout-related props** (no business logic).
- Standard layout components:
  - `Container.svelte` -- max-width wrapper with responsive padding
  - `Stack.svelte` -- vertical flex layout with configurable `gap` prop
  - `Grid.svelte` -- responsive CSS grid with configurable `cols` and `gap`
  - `Sidebar.svelte` -- collapsible sidebar with responsive behavior
- All layout components use Tailwind classes internally.
- Export all from `layout/index.ts`.

### Routes

- Routes use `+page.server.ts` to produce view models (load function returns data).
- `+page.svelte` receives the view model as props and renders pure UI.
- No data fetching or business logic in `+page.svelte` -- it is a presentation-only component.

## README.md Per Feature

Every feature directory contains a `README.md` with the following structure:

```markdown
# feature-{name}

## Public API
- `{ExportedType}` -- {description}
- `{exportedFunction}` -- {description}

## Component Tree
{diagram or list showing which components render which}

## Data Flow
{how data enters this feature and where it goes}
```

Example:

```markdown
# feature-dashboard

## Public API
- `DashboardMetricCard` -- displays a single metric with trend indicator
- `DashboardActivityFeed` -- scrollable activity list
- `type DashboardVM` -- view model for the dashboard page

## Component Tree
- DashboardPage
  - DashboardMetricCard (x4)
  - DashboardActivityFeed
    - DashboardActivityItem

## Data Flow
- +page.server.ts loads mock data -> createDashboardVM() -> +page.svelte
- DashboardPage receives DashboardVM as prop
- Metric cards receive individual MetricVM slices
- Activity feed receives ActivityVM array
```
