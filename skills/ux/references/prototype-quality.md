# Prototype Quality Reference

Principles and anti-patterns for ux:prototype. Referenced from SKILL.md Step 9 audit checklists.

---

## Critical Principles

1. **A prototype that only works with perfect data is a lie.** Every component that receives data must render a loading skeleton, an error message, and an empty state.
2. **If it's not in the README, the reviewer will guess.** Each feature README must document the public API (props and events), not just the component tree.
3. **Fake data is still data.** Factories must use realistic names, plausible lengths, and diverse content.

---

## Anti-Patterns

### Business logic in +page.svelte
`+page.svelte` is a presentation component. Filtering, sorting, grouping, formatting, and derivations belong in the factory or view-model layer. If `+page.svelte` contains an `if` block that computes something other than visibility, it is doing too much.

### Importing across feature boundaries via internals
```ts
// BAD -- reaches into another feature's internals
import { UserCard } from '$features/feature-auth/components/UserCard.svelte';

// GOOD -- uses the public barrel
import { UserCard } from '$features/feature-auth';
```
Cross-feature imports that skip the barrel file create hidden coupling. The barrel is the contract.

### Using `any` types
Every entity that reaches a component must pass through a zod schema. `any` means the factory is lying about its contract. `unknown` + `safeParse` is always the correct pattern for data at trust boundaries.

### Designing only for happy-path data
A component that renders `items.map(...)` without a guard for `items.length === 0` will show a blank page in production. Every collection must handle empty. Every async boundary must handle loading and error. This is not optional in a prototype meant to be reviewed.

### Treating mock data as throwaway
If the prototype shows "John Doe" and "Lorem ipsum", the reviewer will not engage with whether the layout works for a 47-character name or a 3-word description. Factory data should mirror real-world distribution: mix short and long strings, include edge-case values, use real-sounding names and content.

---

## State Completeness Checklist

For every data-bound component before the prototype is reviewed:

- [ ] Loading state: `<Skeleton>` with the same layout as the loaded state
- [ ] Error state: `<Alert variant="destructive">` with message and retry
- [ ] Empty state: purposeful UI with a call to action (not a blank div)
- [ ] Happy path: realistic data (no placeholders)

---

## Accessibility Checklist (WCAG 2.1 AA)

- [ ] Icon-only buttons have `aria-label`
- [ ] All `<img>` have `alt`; decorative images use `alt=""`
- [ ] Every `<input>` and `<select>` has an associated `<label>`
- [ ] State is not indicated by color alone (add icon or text)
- [ ] All interactive elements are keyboard-reachable in logical order
