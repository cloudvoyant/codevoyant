# template-contract — how workflows derive structure from templates

> **Markdown output: soft-wrap prose, never hard-wrap** — when a workflow writes a doc `.md` per this contract, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

The templates under `references/templates/` are the **single source of structure**. Workflows never hard-code section names, diagram types, or API-section names — they resolve a doc's template (see `references/scaffold.md`) and derive everything from the template itself. This is what lets you edit a template and have `review`, `update`, `retcon`, and `validate` pick up the change automatically, with no workflow edits.

## What a template must provide

Every template file has two parts, in order:

1. **YAML frontmatter** — the first line is `---`; the block ends with a second `---`. It carries `globs:` (and `index: true` for the two index docs). A `# @agent: …` comment inside the block explains the keys.
2. **Sections** — `##`/`###` headings, each introduced by a `<!-- @agent: … -->` marker. The first content line after the `# {name}` H1 is `## Overview` — no prose between the title and Overview.

## Machine-readable markers (the contract)

Workflows read these markers from the template. Do not invent other marker tokens — `validate` enforces exactly these.

| Marker                              | Meaning                                                                                                                                                                              | Used by                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `<!-- @agent: guidance … -->`       | The base annotation form — authoring guidance with no mechanical effect (never a line-level edit). Carries no token. The shared contract is `skills/shared/annotations.md`.           | retcon, update                               |
| `<!-- @agent: (optional) … -->`     | Marks the **block it precedes** as optional: a section whose FIRST marker under the heading starts with `(optional)`, OR a diagram/table block inside a required section. Absence of an optional block is never flagged. | review 3a, update --scaffold, retcon |
| `<!-- @agent: [components] … -->`   | This heading is Design's **Components** subsection — where a parent names+links its child docs (Rule 3). It may contain the `### Components` system diagram. Exactly one per component and architecture template. Always required. | review 3f, coverage-and-api Step C, validate |
| `<!-- @agent: [public-api] … -->`   | This heading is the doc's **public API surface** (Rule 4). Exactly one per component template. Its heading is the API section other docs may reference. Always required.              | review 3e, coverage-and-api Rule 4, validate |
| `<!-- @edit: instruction … -->`     | A concrete change applied to the attached line/block — the named alias of the minor `<!-- >` form. Requested by the user and applied by `/docs update`. The shared contract is `skills/shared/annotations.md`. | update                                       |
| `index: true` (frontmatter)         | This doc is an **index doc** (spans `**`, exempt from Rule 2). Carried by `project-readme.md` and `architecture.md` only.                                                             | review 3e, coverage-and-api Step A, retcon   |

## Deriving the required structure

To check a doc, resolve its template (`references/scaffold.md`: `references/templates/{type}.md`), then:

### 1. Required sections

Collect every `##` and `###` heading in template order. A heading is **required** unless BOTH hold:

- the first `<!-- @agent: … -->` marker directly under it starts with `(optional)`, AND
- it does NOT carry a `[components]` or `[public-api]` marker.

A `[components]` or `[public-api]` heading is always required, even if an `(optional)` diagram block sits inside it. The doc must contain every required heading (in template order). That is the entire structure check — edit the template, and what review requires changes with it.

### 2. Required diagrams

For each **required** heading, look inside that heading's section of the template (until the next same-or-lower heading). For each ` ```mermaid ` fence there, check the `<!-- @agent: … -->` marker that precedes it:

- marker starts with `(optional)` → the diagram is optional, do not expect it;
- otherwise → the **diagram type** on the line after the fence is required for that section.

The doc must contain a ` ```mermaid ` fence of the same type somewhere in that section. Do not expect any diagram a template does not prescribe.

### 3. The public API section

The heading whose marker contains `[public-api]`. Its heading is what Rule 4 / Rule 5 check against.

### 4. The Components section

The heading whose marker contains `[components]`.

### 5. Index docs

A doc carrying `index: true` in frontmatter is an index doc (see `coverage-and-api.md` Rule 2).

## Editing templates safely

- Rename a heading, add a heading, remove a heading, or change a diagram type → review/update/validate requirements follow automatically.
- Marking something optional: start its marker with `(optional)` — for a whole section (first marker under the heading) or a diagram block inside a required section.
- Promoting a section to public API / Components: add the `[public-api]` / `[components]` token to its marker. Every component template MUST keep exactly one of each — `validate` and `test_scaffold.py` enforce this.
- Keep the first line `---` and a `# Title` H1 (the `{name}` token) after the frontmatter, and start `## Overview` directly after the title — VitePress and the scaffold script depend on both.
