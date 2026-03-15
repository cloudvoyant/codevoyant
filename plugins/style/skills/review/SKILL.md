---
description: Check compliance with the style guide. Use for any style audit — quick validation of recent changes, a specific commit, a directory, or a full branch/repo sweep. Triggers on keywords like style check, validate style, review style, check compliance, style audit, lint style, check my changes.
argument-hint: "[recent|commit|branch|dir [path]|repo|files <pattern>] [--fix]"
disable-model-invocation: true
model: claude-sonnet-4-6
hooks:
  Stop:
    - hooks:
        - type: command
          command: |
            TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ"); if [ -f ".codevoyant/style/REVIEW.md" ]; then VIOLATIONS=$(grep -c "^### V" .codevoyant/style/REVIEW.md 2>/dev/null || echo 0); WARNINGS=$(grep -c "^### W" .codevoyant/style/REVIEW.md 2>/dev/null || echo 0); if [ -f ".codevoyant/style/compliance.json" ]; then TMP=$(jq --arg ts "$TS" --argjson v "$VIOLATIONS" --argjson w "$WARNINGS" '.history += [{"timestamp": $ts, "violations": $v, "warnings": $w, "reviewFile": ".codevoyant/style/REVIEW.md"}]' .codevoyant/style/compliance.json 2>/dev/null); [ -n "$TMP" ] && echo "$TMP" > .codevoyant/style/compliance.json; fi; fi
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Check compliance with style guide rules. Adapts from a fast inline check to a full parallel agent audit based on scope.

## Usage

```
/style:review                    # ask what to check
/style:review recent             # uncommitted + staged changes (fast)
/style:review commit             # last commit
/style:review branch             # full branch vs base — parallel audit → REVIEW.md
/style:review dir                # current directory tree
/style:review dir path/to/sub    # specific subdirectory
/style:review repo               # all tracked files
/style:review recent --fix       # check recent changes and auto-fix
```

## Step 0: Parse Arguments

```bash
SCOPE=""           # recent | commit | branch | dir | repo | files
SCOPE_PATH="."     # for dir scope
AUTOFIX=false      # --fix flag
```

Parse `$ARGUMENTS`:
- `recent` → SCOPE=recent
- `commit` → SCOPE=commit
- `branch` → SCOPE=branch
- `dir [path]` → SCOPE=dir, SCOPE_PATH={second arg or "."}
- `repo` → SCOPE=repo
- `files <pattern>` → SCOPE=files, SCOPE_PATTERN={arg}
- `--fix` anywhere → AUTOFIX=true
- No argument → ask user (Step 0.5)

## Step 0.5: Ask Scope (if no argument)

Use **AskUserQuestion**:
```
question: "What would you like to check?"
header: "Style Review"
multiSelect: false
options:
  - label: "Recent changes"
    description: "Uncommitted and staged changes — fast inline check"
  - label: "Last commit"
    description: "Files and message from the most recent commit"
  - label: "Branch"
    description: "Full audit of this branch vs base — parallel agents, writes REVIEW.md"
  - label: "Directory"
    description: "All files under a path (will ask which one)"
  - label: "Entire repo"
    description: "Full repo audit — thorough but slow"
```

If "Directory" selected, ask for the path.

## Step 1: Load Style Rules and Tooling

Read CLAUDE.md and `.codevoyant/style/config.json`. Build a rule index grouped by CLAUDE.md section:

```json
{
  "rules": [
    { "id": "slug", "text": "...", "contexts": ["code","typescript"], "severity": "violation|warning|suggestion" }
  ]
}
```

Detect LSP and linting config — these inform depth of code-style checks:
- `tsconfig.json` → TypeScript strict settings (noImplicitAny, strictNullChecks, etc.)
- `.eslintrc.*` / `eslint.config.*` → ESLint rules
- `pyrightconfig.json` → Pyright type checking
- `mypy.ini` / `[mypy]` in `pyproject.toml` → MyPy strictness
- `.golangci.yml` → Go linter config
- `.editorconfig` → baseline formatting rules

Store as `LSP_CONFIG`.

If no rules found: report and exit.

## Step 2: Collect Files

| Scope | Files |
|---|---|
| `recent` | `git diff --name-only HEAD` + `git diff --cached --name-only` |
| `commit` | `git diff-tree --no-commit-id -r --name-only HEAD` |
| `branch` | `git diff {BASE}...HEAD --name-only` |
| `dir` | `git ls-files {SCOPE_PATH}` |
| `repo` | `git ls-files` |
| `files` | glob matching `SCOPE_PATTERN` |

For `branch`, auto-detect base:
```bash
BASE=$(git rev-parse --verify origin/main 2>/dev/null && echo origin/main || \
       git rev-parse --verify origin/master 2>/dev/null && echo origin/master || \
       echo main)
```

Also collect commit log for `branch` and `commit` scopes (for commit message rules).

## Step 3: Choose Execution Mode

**Lightweight** (inline, fast): `recent` or `commit` scope, or `dir`/`files` with ≤ 10 files.

**Heavy** (parallel agents + REVIEW.md): `branch` or `repo` scope, or `dir`/`files` with > 10 files.

→ Lightweight → **Step 4a**
→ Heavy → **Step 4b**

---

## Step 4a: Lightweight — Inline Validation

Run checks inline against collected files and rules.

### Commit message (if scope includes a commit)
- Matches conventional format: `type(scope): subject`
- Subject ≤ 72 characters
- No self-attribution lines

### Code files — per applicable rule
- Match each rule's contexts against file type (`*.ts` → code/typescript, `*.md` → docs, `justfile` → build/tools)
- Flag LSP violations (e.g. `any` type when `noImplicitAny` is on)

### Report inline:
```
Style check — {scope}

Score: 85% (17/20 checks passed)

✗ Violations (1):
  commit: subject line 78 chars (max 72) — shorten to fit

⚠  Warnings (1):
  src/auth.ts:42 — `let user` → prefer `const`

💡 Suggestions (1):
  README.md — code changed but docs not updated
```

If violations exist or AUTOFIX=true, use **AskUserQuestion**:
```
question: "Fix {N} violation(s) automatically?"
header: "Auto-Fix"
multiSelect: false
options:
  - label: "Fix all"
    description: "Apply all fixable violations and warnings"
  - label: "Choose individually"
    description: "I'll pick which ones to apply"
  - label: "Skip"
    description: "Just show me the report"
```

Apply selected fixes and report what changed.

Update `.codevoyant/style/compliance.json` with a run entry.

---

## Step 4b: Heavy — Parallel Agent Audit

Notify: `🔍 Reviewing {N} sections in parallel...`

### Build section list

From the rule index, group rules by CLAUDE.md section. Each section with at least one applicable rule → one agent. Skip commit-only sections if SCOPE != branch/commit.

```
SECTIONS = [
  { name: "Build System", slug: "build-system", contexts: [...], rules: [...] },
  { name: "TypeScript Style", slug: "typescript-style", contexts: [...], rules: [...] },
  ...
]
```

### Launch all agents in one message (truly parallel)

```
TaskCreate:
  subagent_type: style-reviewer
  run_in_background: true
  description: "style review: {section.name}"
  prompt:
    Section: {section.name}
    Contexts: {section.contexts}
    Rules: {full rule text}
    LSP configuration: {LSP_CONFIG — include for code sections}
    {if branch/commit scope}
    Commits: {git log output}
    {endif}
    Files: {file list filtered to section's contexts}
    Return findings as JSON with "section": "{section.slug}".
```

### Collect results

Wait for each (TaskOutput block=true). Parse JSON. Aggregate into `COMBINED_FINDINGS[]`. Log any agent errors under `## Agent Errors` in the report.

### Write `.codevoyant/style/REVIEW.md`

```markdown
# Style Guide Review

**Generated:** {ISO-8601 UTC}
**Scope:** {scope description}
**Rules loaded:** {N}

## Summary

| Severity   | Count |
|------------|-------|
| Violation  | X     |
| Warning    | Y     |
| Suggestion | Z     |
| **Total**  | N     |

{if 0 findings} ✅ No violations found. All checks passed. {endif}

---

## Violations

### V{N}: {Rule Name}

- **Severity:** Violation
- **Rule:** {full rule text}
- **File:** `path/to/file` (line N)
- **Context tags:** tag1, tag2

**Found:**
```
{offending snippet — max 5 lines}
```

**Expected:**
```
{corrected version}
```

**Fix:** {one-line plain-English instruction}

---

## Warnings

{same format, W{N} prefix}

---

## Suggestions

{same format, S{N} prefix — no Expected block, just a Note: field}

---

## Fix Instructions for Agent

{N}. [{severity}] {fix instruction} — `{file}:{line}`
...

Violations must be fixed. Warnings should be fixed. Suggestions are optional.
```

### Report to user:

```
✓ Review complete — .codevoyant/style/REVIEW.md written

  Violations : {N}
  Warnings   : {N}
  Suggestions: {N}

  To fix all issues, run:
    "Read .codevoyant/style/REVIEW.md and apply every fix in the Fix Instructions section."
```

If AUTOFIX=true (`--fix` flag): immediately launch a follow-up agent with that prompt.
