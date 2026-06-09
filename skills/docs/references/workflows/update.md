# update — add to an existing doc from current session context

Update a specific documentation file based on changes visible in the current conversation session. Additive only — never removes or overwrites existing content.

## Variables

- `TARGET` — component name or doc path from REMAINING_ARGS
- `FOCUS` — optional `--add-env-vars`, `--add-endpoints`, `--add-flow` flag to scope the update

## Step 1: Identify target file

If TARGET matches a file path directly, use it.
Otherwise resolve:
- `readme` → `docs/README.md`
- `architecture` → `docs/architecture/README.md`
- `{name}` → `docs/architecture/{name}.md`

If the file doesn't exist: suggest `docs new {name}` instead and stop.

## Step 2: Read the existing file

Read the full content of the target file. Build a map of which sections are present and their current content.

## Step 3: Scan session context for changes

Examine the current conversation for:
- New files created or modified (Edit/Write tool use patterns)
- New environment variables mentioned
- New API endpoints described
- New design decisions made
- New dependencies added
- Feature descriptions from the user

Build a `CHANGES` list — each entry has: `{type, description, target_section}` where `target_section` is the doc section it belongs in (Requirements, Design, Implementation, References).

If no changes are detectable from session context, report:
```
No session changes detected for docs/architecture/{name}.md.
To update manually: edit the file directly and run /spec update to log changes.
```
Then stop.

## Step 4: Determine additions

For each change in CHANGES:
1. Identify the corresponding section in the existing doc
2. Determine WHERE within the section to add (append to existing table row, new bullet, new subsection)
3. Draft the addition following language-guide rules

Rules:
- **Never delete** existing content
- **Never replace** existing prose — append or extend
- If a required section is entirely missing, add it as a new section at the correct position
- New env vars → add row to env vars table (or create table if absent)
- New endpoints → add row to endpoints table
- New flow steps → add a new subsection or extend existing steps
- New design decisions → add bullet to appropriate Design subsection

## Step 5: Preview and confirm

Show the user each proposed addition:
```
Proposed additions to docs/architecture/{name}.md:

  ## Implementation > Environment Variables
  + | NEW_VAR | Description of the new var | yes |

  ## Requirements
  + - Must support {new requirement}
```

Use AskUserQuestion:
- "Apply all additions" — write all
- "Skip some" — describe in Other which to skip
- "Cancel" — no changes

## Step 6: Write additions

Apply all approved additions to the file. Write the file.

## Step 7: Report

```
Updated docs/architecture/{name}.md

  Added:
    {section}: {brief description of addition}
    ...

Run /docs review {name} to check for remaining gaps.
```
