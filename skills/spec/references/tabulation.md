# tabulation — exhaustive enumeration of user-specified sets

LLMs silently drop enumerated items. Tabulation makes the enumerable sets in a plan explicit, file-backed, and validation-checked, so nothing the user wrote — in intent.md or the objective — can vanish between intent and execution.

## When a plan MUST tabulate

1. **Rote replacements** — "replace X with Y", "rename A to B", "update every occurrence of Z", vendoring/repathing changes. One row per occurrence or per file, enumerated from the codebase.
2. **Target sets to search or touch** — "these N pages", "all files matching P", "each module in this list", migration/rollout sets. One row per target, enumerated from the codebase (glob/grep) when the set is derivable.
3. **Enumerated requirement sets** — checklist-style items the user wrote in intent.md (numbered or bulleted lists of concrete things that must be done). One row per item, each carrying an Intent-ref back to the intent.md line it came from.

If the objective or intent contains any of these and the plan has no table for it, that is a tabulation defect — validation fails the plan.

## Where tables live

`$PLAN_DIR/tables/{set-slug}.md` — one file per enumerable set. plan.md lists every table in its `## Tables` section with the row count and the phase that owns it.

## Table shape

Header row, then one row per item. Required columns: `#` (row number), `Item`, `Status` (starts `[ ]`; execution marks `[x]`). Set-specific columns as needed:

- Rote replacements: `File`, `Old`, `New`.
- Target sets: `Path`, `Action`.
- Requirement sets: `Intent ref` (REQUIRED — the intent.md section/line the item comes from).

```markdown
# Table: {set name}

Source: {intent.md section | glob/grep command used to enumerate}

| # | Item | {set-specific columns} | Status |
| --- | --- | --- | --- |
| 1 | {item} | {...} | [ ] |
```

## Enumeration rules

- **Enumerate from the codebase, never from memory.** For rote replacements and target sets, run the real glob/grep and list the actual paths/occurrences found; record the command in the table's `Source:` line. A table written from memory is a tabulation defect.
- **Every enumerated requirement item traces to intent.md.** A requirement row without an Intent ref fails validation; an intent.md item present in no table fails validation.
- **Every row is owned by exactly one task.** Phase tasks that consume a table name it and mark rows `[x]` as they complete them; a row no task references fails validation.
- **Recount at validation.** For codebase-enumerated tables, validation re-runs the Source command; a row-count mismatch is drift and fails the gate (the set changed — re-enumerate).

## Validation-time checks (SCOPE=tabulation)

1. Every enumerable set in the objective/intent has a table.
2. Every requirement-set row carries an Intent ref, and every enumerated intent.md item appears in some table.
3. Codebase-enumerated tables match a fresh recount of their Source command.
4. Every table row is referenced by a phase task, and plan.md's `## Tables` section lists every table file.

Any failure is blocking — the planner repairs the table (or the tasks) before the plan is ready.
