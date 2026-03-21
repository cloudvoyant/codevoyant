# @codevoyant/agent-kit

A CLI toolkit that skills and agents use to perform common operations: detecting task runners, querying git metadata, identifying CI providers, managing team knowledge, sending notifications, and more.

Skills call these commands directly from bash steps rather than re-implementing the logic themselves. All commands are available via `npx` without installation.

```bash
npx @codevoyant/agent-kit <command> [subcommand] [flags]
```

---

## mem

Team knowledge indexing and lookup.

```bash
npx @codevoyant/agent-kit mem index              # scan project, write .codevoyant/mem.json
npx @codevoyant/agent-kit mem find --tag pnpm    # query index by tag
npx @codevoyant/agent-kit mem find --type recipe --json
npx @codevoyant/agent-kit mem remember           # dump index as LLM-ready table
```

`mem index` scans all `.md` files with YAML frontmatter, excluding `node_modules/`, `.codevoyant/`, and `.git/`. Files with `status: archived` are skipped.

`mem find` supports `--tag` (repeatable, AND logic), `--type`, and `--json`. Without `--json`, returns one path per line.

`mem remember` is called at session start (via `CLAUDE.md` or `/mem:remember`) to load team knowledge into context.

The docs directory is configurable: `mem.docsDir` in `.codevoyant/settings.json` (default: `docs`).

---

## task-runner

Detect and invoke the project's task runner (npm, pnpm, yarn, mise, just, task).

```bash
npx @codevoyant/agent-kit task-runner detect     # detect and cache runner
npx @codevoyant/agent-kit task-runner list       # list available tasks
npx @codevoyant/agent-kit task-runner run test   # run a named task
npx @codevoyant/agent-kit task-runner run lint -- --fix
```

Skills use this to run `format`, `lint`, `test`, and `build` tasks without hardcoding the runner.

---

## git

Git metadata extraction for use in skill scripts.

```bash
npx @codevoyant/agent-kit git branch             # current branch name
npx @codevoyant/agent-kit git branch --clean     # strip feature/, bugfix/ prefixes
npx @codevoyant/agent-kit git repo-name          # repo name from remote URL
npx @codevoyant/agent-kit git issue-id           # extract issue ID from branch (e.g. ENG-123)
```

---

## ci

CI/CD provider detection.

```bash
npx @codevoyant/agent-kit ci detect              # outputs JSON: { provider, remote }
```

Returns `github`, `gitlab`, or `unknown`. Used by `/dev:ci` to pick between `gh` and `glab`.

---

## notify

Cross-platform desktop notifications.

```bash
npx @codevoyant/agent-kit notify --title "Claude Code" --message "Done"
npx @codevoyant/agent-kit notify --title "CI" --message "Failed" --silent
```

`--silent` is a no-op, making it easy for skills to pass a flag through without branching.

---

## settings

Read values from `.codevoyant/settings.json` using dot-notation.

```bash
npx @codevoyant/agent-kit settings get mem.docsDir
npx @codevoyant/agent-kit settings get docs
```

Returns the value, or exits with code 1 if the key doesn't exist (useful with `|| echo "default"`).

---

## perms

Agent permission management.

```bash
npx @codevoyant/agent-kit perms detect           # detect which agent is running
npx @codevoyant/agent-kit perms add --plugins spec,dev
npx @codevoyant/agent-kit perms add --plugins em --global
```

Used by `/spec:allow`, `/dev:allow`, etc. to pre-approve bash commands for uninterrupted execution.

---

## worktrees

Git worktree lifecycle management.

```bash
npx @codevoyant/agent-kit worktrees create --branch feat/my-plan --plan my-plan
npx @codevoyant/agent-kit worktrees remove --branch feat/my-plan
npx @codevoyant/agent-kit worktrees prune
```

Used by spec skills to create and clean up isolated worktrees for background plan execution.

---

## Programmatic usage

```ts
import { readPlans, writePlans, readWorktrees, writeWorktrees, readSettings, findProjectRoot } from '@codevoyant/agent-kit';
import type { PlansFile, WorktreesFile, CodevoyantSettings } from '@codevoyant/agent-kit';
```

Key exports: `readPlans`, `writePlans`, `readWorktrees`, `writeWorktrees`, `readSettings`, `findProjectRoot`, `isInWorktree`, `getRepoName`, `getWorktreePath`.
