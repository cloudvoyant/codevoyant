---
description: Generate and apply the permission config needed for uninterrupted autonomous agent execution — prevents mid-run permission prompts when using /spec:bg, /spec:go, /dev:commit, /dev:ci, or any background agent. Triggers on keywords like allow agent, agent permissions, pre-approve, permission config, allow tools, stop asking for permission, autonomous execution permissions, unblock agent, dev allow, agent interrupted, perms, interrupted execution.
argument-hint: "[--plugins spec,dev,style,adr] [--global] [--apply]"
disable-model-invocation: true
model: claude-haiku-4-5-20251001
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply.

Generate and apply the minimal permission configuration for uninterrupted autonomous execution across Claude Code, OpenCode, and VS Code Copilot.

## Flags

- `--plugins <list>`: Comma-separated plugin names to include (e.g. `--plugins spec,dev`). Valid values: `spec`, `dev`, `style`, `adr`. If omitted, asks the user.
- `--global`: Apply to global config instead of project-level (Claude Code only; OpenCode is always global)
- `--apply`: Write config directly after confirmation steps, without a separate "apply?" prompt

## How Scoping Works

Two independent layers control what an agent can do without prompting:

```
Agent tools: frontmatter  →  what the agent is allowed to attempt
permissions.allow         →  which of those don't prompt the user for approval
```

Pre-approved permissions are global in the config file, but they're only reachable by agents that already declare that tool in their `tools:` frontmatter. An agent without `Bash` listed can never trigger a Bash prompt regardless of what settings.json allows. This means the `tools:` field is the primary scoping boundary — `permissions.allow` only removes the confirmation step for operations the agent was already scoped to perform.

**`git push` is treated separately** — it's powerful enough to warrant its own explicit confirmation even when other permissions are being batch-approved.

**`$()` command substitution prompts:** Claude Code pattern-matches on the full command string. `git commit -m "$(cat <<'EOF'..."` triggers a separate prompt because `$(` looks like a nested shell invocation even though it's inside `git commit`. Adding `Bash(git commit -m:*)` explicitly covers this — the `:*` wildcard matches the full message string including any `$(...)` expansion. The same applies to `git commit --amend`. These entries are included specifically to prevent those prompts.

## Step 0: Parse Arguments

Extract `--plugins`, `--global`, and `--apply` from the argument string.

```
PLUGINS = comma-split of --plugins value, trimmed, lowercased
          e.g. "--plugins spec,dev" → ["spec", "dev"]
GLOBAL  = true if --global present
APPLY   = true if --apply present
```

If `PLUGINS` is empty (no `--plugins` flag given), proceed to Step 0.5. Otherwise skip to Step 1.

## Step 0.5: Ask Which Plugins

Use **AskUserQuestion**:

```
question: "Which plugins do you need autonomous execution permissions for?"
header: "Plugin Scope"
multiSelect: true
options:
  - label: "spec"
    description: "spec:bg, spec:go, spec:new — background agents, plan execution, research"
  - label: "dev"
    description: "dev:commit, dev:ci, dev:rebase, dev:pr-fix — includes git push and gh/glab CLI"
  - label: "style"
    description: "style:init, style:review, style:doctor — CLAUDE.md management"
  - label: "em"
    description: "em:plan, em:breakdown, em:review, em:sync — epic and roadmap planning"
  - label: "pm"
    description: "pm:plan, pm:breakdown, pm:prd, pm:review — product roadmaps and PRDs"
  - label: "adr"
    description: "adr:new, adr:capture — architecture decision records"
```

Store the selected labels as `PLUGINS`.

## Step 1: Detect Project Task Runners

Use `Glob` to detect task runner files — cross-platform, no Bash needed:

- `justfile` or `Justfile` → add `"Bash(just:*)"`
- `Makefile` → add `"Bash(make:*)"`
- `package.json` present:
  - `yarn.lock` → add `"Bash(yarn:*)"`
  - `pnpm-lock.yaml` → add `"Bash(pnpm:*)"`
  - Otherwise → add `"Bash(npm run:*)"`, `"Bash(npm install:*)"`, `"Bash(npx:*)"`
- `Taskfile.yml` or `Taskfile.yaml` → add `"Bash(task:*)"`

Store as `TASK_RUNNER_CMDS`.

## Step 2: Detect Installed Platforms

Use `Glob` and `Read`:

- **Claude Code**: Glob for `.claude/settings.json` or `.claude/settings.local.json`. Also try reading `~/.claude/settings.json`. Present if either exists.
- **OpenCode**: Try reading `~/.config/opencode/config.json`. Present if file exists.
- **VS Code Copilot**: Glob for `.github/agents/*.agent.md`. Present if any found.

Report detected platforms. Configs will be created fresh if files don't exist yet.

## Step 3: Build Permission Set

Collect entries from each selected plugin. All plugins share the `.codevoyant/` baseline.

### Shared baseline (all plugins)

These entries are included regardless of which plugins are selected:

**Claude Code allow entries:**
```
Read
Glob
Grep
Write
Edit
Bash(mkdir:*)
Bash(cp:*)
Bash(mv:*)
Bash(cat:*)
Bash(find:*)
Bash(ls:*)
Bash(echo:*)
Bash(date:*)
Bash(jq:*)
Bash(bash:*)
```

**`.codevoyant/` access note:** The `Write` and `Edit` tools are pre-approved unconditionally above — this covers all writes to `.codevoyant/plans/`, `.codevoyant/spec.json`, and all other plugin data files without any path restrictions.

**OpenCode:** `"read": "allow"`, `"edit": "allow"`, `"write": "allow"`, `"glob": "allow"`, `"grep": "allow"`, `"list": "allow"`, `"todowrite": "allow"`, `"todoread": "allow"`

---

### `spec` plugin

Agents: `spec-executor`, `spec-planner`, `spec-explorer`

**Claude Code allow entries (add to baseline):**
```
Bash(git status:*)
Bash(git diff:*)
Bash(git add:*)
Bash(git commit:*)
Bash(git commit -m:*)
Bash(git commit --amend:*)
Bash(git log:*)
Bash(git rev-parse:*)
Bash(git worktree:*)
Bash(git stash:*)
Bash(git checkout:*)
Bash(git fetch:*)
WebSearch
WebFetch
+ TASK_RUNNER_CMDS
```

**OpenCode (add to baseline):** `"bash": "allow"`, `"task": "allow"`, `"webfetch": "allow"`, `"websearch": "allow"`

---

### `dev` plugin

Skills: `dev:commit`, `dev:ci`, `dev:rebase`, `dev:pr-fix`, `dev:diff`

**Claude Code allow entries (add to baseline):**
```
Bash(git status:*)
Bash(git diff:*)
Bash(git add:*)
Bash(git commit:*)
Bash(git commit -m:*)
Bash(git commit --amend:*)
Bash(git log:*)
Bash(git rev-parse:*)
Bash(git fetch:*)
Bash(git pull:*)
Bash(git rebase:*)
Bash(git rebase --continue:*)
Bash(git stash:*)
Bash(git checkout:*)
Bash(git clone:*)
Bash(gh run list:*)
Bash(gh run view:*)
Bash(gh run watch:*)
Bash(gh pr list:*)
Bash(gh pr view:*)
Bash(gh pr diff:*)
Bash(gh issue view:*)
Bash(glab ci list:*)
Bash(glab ci status:*)
Bash(glab ci trace:*)
Bash(glab mr list:*)
Bash(glab mr view:*)
Bash(glab api:*)
Bash(osascript:*)
Bash(notify-send:*)
+ TASK_RUNNER_CMDS
```

**`git push` is handled separately in Step 4 — do not include it here yet.**

**OpenCode (add to baseline):** `"bash": "allow"`, `"task": "allow"`, `"webfetch": "allow"`, `"websearch": "allow"`

---

### `style` plugin

Skills: `style:init`, `style:add`, `style:review`, `style:doctor`, `style:learn`, `style:contexts`

**Claude Code allow entries (add to baseline):**
```
Bash(git status:*)
Bash(git diff:*)
Bash(git log:*)
+ TASK_RUNNER_CMDS
```

**OpenCode (add to baseline):** `"bash": "allow"`, `"task": "allow"`

---

### `em` plugin

Skills: `em:plan`, `em:breakdown`, `em:review`, `em:sync`

**Claude Code allow entries (add to baseline):**
```
Bash(git log:*)
Bash(git shortlog:*)
Bash(git diff:*)
Bash(git rev-parse:*)
Bash(gh issue view:*)
Bash(glab issue view:*)
Bash(sleep:*)
+ TASK_RUNNER_CMDS
```

**OpenCode (add to baseline):** `"bash": "allow"`

---

### `pm` plugin

Skills: `pm:plan`, `pm:breakdown`, `pm:prd`, `pm:review`

**Claude Code allow entries (add to baseline):**
```
WebSearch
WebFetch
+ TASK_RUNNER_CMDS
```

**OpenCode (add to baseline):** `"bash": "allow"`, `"webfetch": "allow"`, `"websearch": "allow"`

---

### `adr` plugin

Skills: `adr:new`, `adr:capture`

No additional entries beyond the shared baseline — ADR skills only read the conversation and write files, which the baseline already covers.

---

After collecting all entries, deduplicate the final list.

## Step 4: Git Push Confirmation (dev plugin only)

If `dev` is in `PLUGINS`, ask separately before building the final config:

```
question: "Should git push be pre-approved for dev workflow skills?"
header: "Git Push"
multiSelect: false
options:
  - label: "Yes — pre-approve push"
    description: "Allows dev:commit and dev:ci --autofix to push without prompting. Uses git push origin:* and git push --force-with-lease:* (never git push --force)"
  - label: "No — keep asking for push"
    description: "All other dev permissions apply; git push still prompts each time"
```

- If **Yes**: add `"Bash(git push origin:*)"` and `"Bash(git push --force-with-lease:*)"` to the Claude Code allow list. For OpenCode, `bash: allow` already covers it (no separate entry needed).
- If **No**: exclude push entries. Note in the summary that push will still prompt.

## Step 5: Build Platform Configs

### Claude Code

```json
{
  "permissions": {
    "allow": [ /* merged, deduplicated, sorted final list */ ]
  }
}
```

Target: `.claude/settings.json` (default) or `~/.claude/settings.json` if `--global`.

**Merge rule:** Read existing file with `Read` tool (start from `{}` if absent). Union existing `permissions.allow` with new entries — deduplicate by exact string, preserve existing, append new entries sorted alphabetically. Do not touch `deny`, `ask`, or any other top-level keys.

### OpenCode

```json
{
  "permission": {
    "read": "allow",
    "edit": "allow",
    "write": "allow",
    "glob": "allow",
    "grep": "allow",
    "list": "allow",
    "bash": "allow",
    "task": "allow",
    "todowrite": "allow",
    "todoread": "allow",
    "webfetch": "allow",
    "websearch": "allow",
    "question": "ask"
  }
}
```

`question` is always `"ask"` — this is the AskUserQuestion tool (user-facing prompts). Auto-approving it would silently skip confirmation steps.

**Merge rule:** Read existing file with `Read` tool (start from `{}` if absent). Merge only the `permission` key. Preserve all other top-level keys untouched.

### VS Code Copilot

No config file to write — permissions are controlled by the `tools:` field in each `.github/agents/*.agent.md` file.

Read each installed agent file and compare its `tools:` line against the source definition in `plugins/*/agents/`. If outdated (missing tools), show the corrected `tools:` line. If `.github/agents/` doesn't exist, show:
```
bash scripts/install-vscode.sh
```

## Step 6: Present Configs

Show the full config for each detected platform before writing, with a plain-English summary of what is and isn't covered:

```
## Permission Config — {selected plugins}

### Claude Code  →  {target path}
{N} allow entries — covers: git, {task-runner}, Read/Glob/Grep/Write/Edit, {gh/glab if dev}

  "permissions": {
    "allow": [
      ... full sorted list ...
    ]
  }

### OpenCode  →  ~/.config/opencode/config.json
  "permission": {
    "bash": "allow",
    ...
    "question": "ask"   ← user-facing prompts still ask
  }

### VS Code Copilot  →  .github/agents/
{✓ Agent files up to date | ⚠ Changes needed — see above}

---
What's covered:
  ✓ Read, search, and write files (Read, Glob, Grep, Write, Edit — including .codevoyant/ — fully unrestricted)
  ✓ Run git commands (status, diff, add, commit, fetch, rebase, stash, checkout)
  {✓ git push (origin and --force-with-lease only) | ⚠ git push — will still prompt}
  ✓ Run {task-runner} recipes
  {✓ GitHub CLI (gh run *, gh pr *) | — (dev not selected)}
  {✓ GitLab CLI (glab ci *, glab mr *) | — (dev not selected)}
  {✓ Desktop notifications (osascript, notify-send) | — (dev not selected)}
  {✓ Web search and fetch (spec research) | — (spec not selected)}
  ⚠ AskUserQuestion — NOT pre-approved (user-facing choices always prompt)
```

## Step 7: Apply

If `--apply` flag is set, skip the question and proceed directly.

Otherwise ask:

```
question: "Apply these permission configs?"
header: "Apply Permissions"
multiSelect: false
options:
  - label: "Apply all detected platforms"
    description: "Write configs for all platforms shown above"
  - label: "Claude Code only"
    description: "Write {target path} only"
  - label: "OpenCode only"
    description: "Write ~/.config/opencode/config.json only"
  - label: "Show only — don't write"
    description: "I'll apply the config manually"
```

**Writing Claude Code config:**

1. Determine target: `.claude/settings.json` (default) or `~/.claude/settings.json` (`--global`)
2. Read existing file with `Read` tool. If absent, start from `{}`
3. Merge in working memory (preserve all existing keys, union allow array)
4. If `.claude/` directory doesn't exist, create it: `Bash(mkdir -p .claude)`
5. Write complete merged JSON with `Write` tool

Report: `✓ Updated {TARGET} — N total allow entries (M new)`

**Writing OpenCode config:**

1. Target: `~/.config/opencode/config.json`
2. Read existing file with `Read` tool. If absent, start from `{}`
3. Merge only the `permission` key in working memory (preserve all other keys)
4. Write complete merged JSON with `Write` tool

Report: `✓ Updated ~/.config/opencode/config.json — permission block updated`

## Step 8: Post-Apply Summary

```
✓ Done. Agents can now run without permission interruptions.

Try it:
  /spec:bg {most-recent-plan}   # autonomous plan execution
  /dev:commit                   # format → commit → push → CI (uninterrupted)

To check what's configured:
  Read {claude-target}
  Read ~/.config/opencode/config.json

To remove these permissions, delete the added entries from the allow arrays.
```
