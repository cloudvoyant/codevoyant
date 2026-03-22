---
description: 'Use when creating a git commit with a conventional commit message. Triggers on: "commit", "commit my changes", "dev commit", "make a commit", "stage and commit". Handles formatting, linting, push, and CI monitoring in one workflow. Supports --yes to skip confirmation, --atomic for multiple logical commits, and --autofix for CI failures.'
name: dev:commit
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms.'
argument-hint: '[--yes|-y] [--no-push] [--autofix] [--atomic] [--single]'
disable-model-invocation: true
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

Create a git commit following conventional commit standards with a professional, concise message.

## Rules

### Choosing the right type

1. Does it add new functionality users can use? → `feat`
2. Does it fix broken behavior? → `fix`
3. Does it change existing behavior (breaking)? → `feat!` or `fix!`
4. Does it only improve code structure? → `refactor`
5. Does it only update documentation? → `docs`
6. Does it only affect tests? → `test`
7. Does it only affect build/CI? → `chore`

> Bump behavior is determined by your project's release config (`.releaserc.*`, `commitizen.config.*`, `[tool.commitizen]`). Do not predict version bumps — check those files if needed.

### Never commit secrets

- Secrets or credentials (.env files, API keys, passwords)
- Warn user if such files are staged

### Formatting

- Always use HEREDOC format for commit messages to ensure proper formatting.
- First line max 72 characters
- Use imperative mood: "add feature" not "added feature" or "adds feature"
- No period at end of first line
- Be professional and concise
- Do NOT include self-attribution (no "Generated with Claude Code", no "Co-Authored-By: Claude")
- **Body: use bullet points, not prose paragraphs.** Each bullet is one change or reason. Keep bullets terse — one line each, under 72 chars.
- Body is optional — only include if the changes aren't obvious from the subject line
- Make body as short as possible, as few bullets as possible
- **Use `type(scope)` format** when changes touch a distinct subsystem — especially with `--atomic` commits. Scope groups entries in the changelog under that feature/fix category (e.g. `feat(opencode)`, `fix(vscode)`).

### Scoped vs. unscoped

- Use `feat(scope)` / `fix(scope)` when the change is clearly bounded to one area: a plugin, tool, subsystem, or named feature
- Use plain `feat:` / `fix:` for cross-cutting changes with no single scope
- Scope should be short, lowercase, no spaces: `opencod`, `vscode`, `spec`, `help`, `e2e`, `docs`, `install`

## Flags

- `--yes` or `-y`: Skip commit message confirmation (auto-approve message)
- `--no-push`: Commit only — do not push or monitor CI
- `--autofix`: After push, if CI fails, automatically attempt to fix failures and re-push
- `--atomic`: Detect logical change groups and create one commit per group
- `--single` (default): All staged changes in one commit

## Workflow

### Step 0: Parse Flags

```bash
YES=false; NO_PUSH=false; AUTOFIX=false; ATOMIC=false
[[ "$*" =~ --yes|-y ]]    && YES=true
[[ "$*" =~ --no-push ]]   && NO_PUSH=true
[[ "$*" =~ --autofix ]]   && AUTOFIX=true
[[ "$*" =~ --atomic ]]    && ATOMIC=true
```

### Step 1: Check Git Status (Fast Path)

**Use conversation context first** - the changes are usually already in context from the work session.

Only run git commands if you need to verify:

```bash
git status
git diff --stat
```

**Skip `git log`** - you should already know the commit message style from:

- Previous commits in this session
- Project's CLAUDE.md conventions
- Standard conventional commit format

**Skip reading plan.md** - if you just implemented a plan, it's already in context.

Only run additional commands if you're truly uncertain about what changed.

### Step 1.5: Format and Lint

Run formatters and linters before staging so any auto-fixes are included in the commit.

**Formatters** (auto-fix, run unconditionally if available):

```bash
npx @codevoyant/agent-kit task-runner run format 2>/dev/null || true
```

If formatter ran and modified files: report `✓ Formatter applied — changes will be included in commit`.

**Linters** (report errors, block commit if they fail):

```bash
npx @codevoyant/agent-kit task-runner run lint 2>/dev/null || \
npx @codevoyant/agent-kit task-runner run check 2>/dev/null || true
```

If linting fails: report the errors and **stop** — do not proceed to staging until fixed:

```
✗ Linting failed — fix the errors above before committing.
```

**Skip silently** if no formatter or linter is configured.

### Step 2: Review with User

**If ATOMIC is true:**

Analyze staged file paths and detect logical groups (by component, package, or directory). Draft a commit message for each group. Output all proposed commits:

```text
Proposed commits:

1. feat(auth): add JWT token validation
2. docs: update API reference
3. test(auth): add token expiry tests
```

Then ask for confirmation using the AskUserQuestion tool:

```yaml
questions:
  - question: 'Do these commits look good?'
    header: 'Review Commits'
    multiSelect: false
    options:
      - label: 'Looks good — commit all'
        description: '{N} commits'
      - label: 'Cancel'
        description: "Don't commit"
```

- If **"Looks good — commit all"**: proceed to Step 3.
- If **"Cancel"**: exit without committing.
- If **Other** (user edits): apply their changes and proceed to Step 3.

**If SINGLE (default):**

Output the full proposed commit message:

```text
Proposed commit message:

{full commit message, including body if present}

```

Then ask for confirmation using the AskUserQuestion tool:

```yaml
questions:
  - question: 'Does this commit message look good?'
    header: 'Review Commit'
    multiSelect: false
    options:
      - label: 'Looks good — commit'
        description: '{first line of proposed message}'
      - label: 'Cancel'
        description: "Don't commit"
```

- If **"Looks good — commit"**: proceed to Step 3.
- If **"Cancel"**: exit without committing.
- If **Other** (user typed a custom message): use it as-is and proceed to Step 3.

**If AUTO_APPROVE is true:** skip this prompt entirely and proceed directly to Step 3. Report: `✓ Auto-approved with --yes flag`.

### Step 3: Stage and Commit

**If ATOMIC is true:** create one commit per group in order:

```bash
git add <files-in-group> && git commit -m "$(cat <<'EOF'
<type>(<scope>): <description for this group>
EOF
)"
```

**Default (SINGLE):**

```bash
git add -A && git commit -m "$(cat <<'EOF'
<type>: <description>

[optional body]
EOF
)"
```

### Step 5: Push and Verify CI

**If NO_PUSH is true:** skip this step entirely and report `✓ Committed (push skipped)`.

**Otherwise — always push, then launch CI monitoring in background:**

1. Push: `git push origin <branch>`
2. After push succeeds, launch CI monitoring as a background Task — do NOT wait for it:

```
Agent:
  subagent_type: general-purpose
  run_in_background: true
  description: "CI monitoring"
  prompt: "Run /dev:ci [--autofix if AUTOFIX=true]. Monitor CI and report results when done."
```

3. Report immediately: `✓ Committed and pushed. CI monitoring running in background — you'll be notified when checks complete.`

**Skip CI monitoring if:**

- Repo has no CI workflows configured
- Neither `gh` nor `glab` CLI is installed (inform but don't block)
