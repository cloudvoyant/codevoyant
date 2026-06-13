# update — apply > / >> annotations from ed artifacts

## Variables

- `TARGET` — file path from REMAINING_ARGS (optional; scan all ed artifacts if empty)

## Step 0: Identify files to scan

If TARGET provided: scan only `TARGET`.

Otherwise, find all ed artifacts:
```bash
find . \( -path './notes/**/*.md' -o -path './guides/**/*.md' \
         -o -path './plans/**/*.md' -o -path './quizzes/**/*.md' \) \
  -not -name 'answers.md' 2>/dev/null
```

## Step 1: Find annotations

For each file, read it and identify lines matching:
- `^> ` (single `>`) — minor annotation
- `^>> ` (double `>>`) — major annotation

Build `ANNOTATION_LIST`: `{ file, line_number, type (minor|major), annotation_text, context_lines }`.

If no annotations found across all files:
```
No annotations found. Add > or >> inline comments to any ed artifact, then run /ed update.
```
Stop.

## Step 2: Apply annotations (one by one)

For each annotation in ANNOTATION_LIST:

1. Read 10 lines of context above and below the annotation
2. Determine what to change:
   - **minor (`>`):** fix, rephrase, or add the described correction in-place. Remove the annotation line after applying.
   - **major (`>>`):** add a new section, expand treatment, or add examples as described. Remove the annotation line after applying.
3. Apply the change using Edit
4. Log: `✓ Applied [{type}] in {file}:{line} — {summary of change}`

## Step 3: Report

```
✅ Annotations applied

  {file}: {N} minor, {M} major annotations processed
  ...

Total: {N} annotations consumed.
```
