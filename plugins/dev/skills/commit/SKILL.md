---
description: "Use when creating a git commit with a conventional commit message. Triggers on: \"commit\", \"commit my changes\", \"dev commit\", \"make a commit\", \"stage and commit\". Handles formatting, linting, push, and CI monitoring in one workflow. Supports --yes to skip confirmation, --atomic for multiple logical commits, and --autofix for CI failures."
argument-hint: "[--yes|-y] [--no-push] [--autofix] [--atomic] [--single]"
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: |
            INPUT=$(cat)
            CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
            if echo "$CMD" | grep -qE "git (commit|add -A|add \.)"; then
              STAGED=$(git diff --cached --name-only 2>/dev/null || true)
              SECRETS=$(echo "$STAGED" | grep -iE "(^|/)\.env$|(^|/)\.env\.|secrets?\.(json|yaml|yml|txt)|\.pem$|\.key$|credentials|\.npmrc$|\.netrc$" | head -5)
              if [ -n "$SECRETS" ]; then
                printf "⛔ Blocked: Potential secrets files staged:\n%s\n\nUnstage them first or add to .gitignore." "$SECRETS" >&2
                exit 2
              fi
            fi
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


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

### Special consideration for template projects

- **Template files are distributed to users** (workflows, configs, scripts,
  etc.)
- Changes to template files that improve user experience → `feat`
- Examples:
  - Faster CI builds (workflow caching) → `feat` (users benefit)
  - Better error messages in scripts → `feat` (users benefit)
  - Internal refactoring of template-only code → `refactor` (users don't see it)
- If users scaffold projects with these files, improvements are features!

### Never commit secrets

- Secrets or credentials (.env files, API keys, passwords)
- Warn user if such files are staged

### Formatting

- Always use HEREDOC format for commit messages to ensure proper formatting.
- First line max 72 characters
- Use imperative mood: "add feature" not "added feature" or "adds feature"
- No period at end of first line
- Be professional and concise
- Do NOT include self-attribution (no "Generated with Claude Code", no
  "Co-Authored-By: Claude")
- **Body: use bullet points, not prose paragraphs.** Each bullet is one
  change or reason. Keep bullets terse — one line each, under 72 chars.
- Body is optional — only include if the changes aren't obvious from the
  subject line
- **Use `type(scope)` format** when changes touch a distinct subsystem —
  especially with `--atomic` commits. Scope groups entries in the changelog
  under that feature/fix category (e.g. `feat(opencode)`, `fix(vscode)`).

### Scoped vs. unscoped

- Use `feat(scope)` / `fix(scope)` when the change is clearly bounded to one
  area: a plugin, tool, subsystem, or named feature
- Use plain `feat:` / `fix:` for cross-cutting changes with no single scope
- Scope should be short, lowercase, no spaces: `opencode`, `vscode`, `spec`,
  `help`, `e2e`, `docs`, `install`

## Examples

Good:

```text
fix(opencode): strip model field from skills on install
```

```text
feat(vscode): install agents globally to ~/.copilot/agents
```

```text
feat(help): rewrite all help skills as hardcoded responses

- Add disable-model-invocation: true to prevent reformatting
- Use haiku model for fastest invocation
- Remove inaccurate trailing "Run /plugin:help" line
```

```text
feat: add user authentication with JWT
```

Bad:

```text
Update documentation files and also added new commit command
```

(Too long, mixed changes, wrong mood)

```text
docs: updated the markdown files to make them look better

I went through all the markdown files and removed the bold formatting
from the headings because it looks better in code editors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

(Prose body, casual tone, self-attribution)

## Flags

- `--yes` or `-y`: Skip commit message confirmation (auto-approve message)
- `--no-push`: Commit only — do not push or monitor CI
- `--autofix`: After push, if CI fails, automatically attempt to fix failures and re-push
- `--atomic`: Detect logical change groups and create one commit per group
- `--single` (default): All staged changes in one commit

## Workflow

### Step 0: Parse Flags

Check `$ARGUMENTS` for these flags — each defaults to false if absent:

- `--yes` or `-y` → AUTO_APPROVE (skip the confirmation prompt)
- `--no-push` → NO_PUSH (commit but don't push or monitor CI)
- `--autofix` → AUTOFIX (if CI fails, attempt automatic fixes)
- `--atomic` → ATOMIC (create one commit per logical change group)
- `--single` → SINGLE (default; all staged changes in one commit)

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

### Step 2: Draft Commit Message

Create a conventional commit message following this format:

```text
<type>[(<scope>)]: <short description>

[optional bullet-point body]
- bullet one
- bullet two
```

Use `(scope)` when the change belongs to a clear subsystem. Omit for
cross-cutting changes. Body bullets are optional — only when useful.

Type must be one of:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes (appears in changelog)
- `refactor`: Code refactoring with no functionality change (appears in changelog)
- `test`: Test additions or changes (appears in changelog)
- `chore`: Build, CI, or tooling changes (hidden from changelog)
- `feat!` or `fix!`: Breaking change

> **Note:** Bump behavior is determined by your project's release config
> (`.releaserc.*`, `commitizen.config.*`, `[tool.commitizen]` in
> `pyproject.toml`). Do not predict version bumps — check those files if needed.

### Step 3: Review with User

Output the full proposed commit message as a code block in your response text:

```
Proposed commit message:

```text
{full commit message, including body if present}
```
```

Then ask for confirmation using the AskUserQuestion tool:

```
question: "Does this commit message look good?"
header: "Review Commit"
multiSelect: false
options:
  - label: "Looks good — commit"
    description: "{first line of proposed message}"
  - label: "Edit the message"
    description: "Let me rephrase it"
  - label: "Cancel"
    description: "Don't commit"
```

- If **"Edit the message"**: ask follow-up: "How would you like to phrase the commit message?" (accept free-form answer), then proceed with the user's revised message.
- If **"Cancel"**: exit without committing.
- If **"Looks good — commit"**: proceed to Step 4.

**If AUTO_APPROVE is true:** skip this prompt entirely and proceed directly to Step 4. Report: `✓ Auto-approved with --yes flag`.

### Step 4: Stage and Commit

**If ATOMIC is true:**

Before staging, detect logical groups by analyzing staged file paths — group by component, package, or directory. For example:

- `src/auth/**` → auth group
- `src/api/**` → api group
- `docs/**` → docs group
- `tests/**` → tests group

Present the proposed grouping to the user and ask them to confirm before proceeding. Then create one commit per group in order:

```bash
git add <files-in-group> && git commit -m "$(cat <<'EOF'
<type>(<scope>): <description for this group>
EOF
)"
```

**Default (SINGLE):**

Stage all changes and create one commit:

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
TaskCreate:
  subagent_type: general-purpose
  run_in_background: true
  description: "CI monitoring"
  prompt: "Run /dev:ci [--autofix if AUTOFIX=true]. Monitor CI and report results when done."
```

3. Report immediately: `✓ Committed and pushed. CI monitoring running in background — you'll be notified when checks complete.`

**Skip CI monitoring if:**
- Repo has no CI workflows configured
- Neither `gh` nor `glab` CLI is installed (inform but don't block)
