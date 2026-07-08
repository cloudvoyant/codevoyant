# update

Apply changes to the **most recent pr artifact** — a PR/MR description, a review, or address proposals — from either:

- `<!-- > … -->` / `<!-- >> … -->` **annotations** you added inline to its local `.codevoyant/review/{slug}/*.md` file, or
- a **chat instruction** describing the change in plain language.

Then re-sync to the platform if that artifact was already pushed there. This is the edit loop for `open` / `review` / `address` output — the same annotation convention as `/ed update` and `/spec update`.

## Arguments

- free-text (optional positional) — a plain-language change request ("make the summary shorter", "drop the comment on foo.ts")
- `--target <path>` — the artifact file to update (default: the most recently modified pr artifact)
- `--type <body|review|address>` — disambiguate by kind instead of a path
- `--pr <id>` / `--github` / `--gitlab`

## Step 0: Parse args

Collect `INSTRUCTION` (the joined free text, may be empty), `TARGET`, `TYPE`, `PR_ID`, provider.

## Step 1: Resolve the artifact ("whatever was done last")

If `--target`/`--type` given, use it. Otherwise pick the **most recently modified** of these under `.codevoyant/review/*/`:

```bash
ls -t .codevoyant/review/*/pr-body.md \
      .codevoyant/review/*/new-review.md \
      .codevoyant/review/*/address.md 2>/dev/null | head -1
```

Classify by filename:
- `pr-body.md` → **description**
- `new-review.md` → **review**
- `address.md` → **address proposals**

If nothing is found: `✗ No pr artifact to update. Run /pr open, review, or address first (with --local to keep it local).` and exit.

Report which artifact you're updating: `Updating {type}: {path}`.

## Step 2: Collect the edits

1. **Annotations** — scan the artifact for HTML-comment annotations, checking for `<!-- >>` (major: expand, add, or rewrite the nearby section) **before** `<!-- >` (minor: fix/rephrase/tighten in place). The instruction is the text between the marker and the closing `-->`; multi-line comments are allowed. Each annotation is an instruction about the content near it. A bare `>` line is an ordinary blockquote, **not** an annotation — leave it alone.
2. **Chat instruction** — if `INSTRUCTION` is non-empty, treat it as an additional change request over the whole artifact.

If there are no annotations and no instruction: `Nothing to update — add <!-- > … --> / <!-- >> … --> notes to {path}, or pass a change request: /pr update "…".` and exit.

## Step 3: Apply the edits to the file

Edit the artifact in place:
- Apply each `<!-- > … -->` / `<!-- >> … -->` annotation, then **remove the entire `<!-- … -->` comment** (it has been consumed).
- Apply the chat `INSTRUCTION`.
- Keep the artifact's structure and follow `references/voice.md` for any prose (terse, human, junior-dev-friendly — for descriptions and review comments alike).
- For a **review** artifact, preserve the `### {file}:{line} — {severity}` blocks and the JSON-derived structure so it can still be pushed.

## Step 4: Re-sync to the platform

Only if the artifact already lives on the platform (skip when it was `--local` and never pushed):

- **description** (`pr-body.md`): if a PR/MR exists for the branch, update it — GitHub `gh pr edit {PR_NUMBER} --body-file {path}`; GitLab `glab mr update {PR_NUMBER} --description "$(cat {path})"`. If no PR exists yet, just keep the file (re-run `/pr open` to create it).
- **review** (`new-review.md`): if a pending draft review was already posted, replace it — delete the pending review, then re-push from the updated doc (`/gh push-comments … --doc {path}` then `/gh draft {PR_NUMBER}`; GitLab equivalents). If it was never pushed, do nothing (re-run `/pr review` to push).
- **address** (`address.md`): local only — re-run `/pr address` to apply the revised proposals. Do not auto-apply from here.

## Step 5: Report

```
✓ Updated {type} ({N} annotation(s){, chat edit}) — {synced to PR/MR #{PR_NUMBER} | kept local at {path}}.
```

If you removed annotations, note how many were consumed. If nothing was synced (local-only), say how to push it (`/pr open`, `/pr review`, or `/pr address`).
