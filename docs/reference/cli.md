# CLI Reference

CLI for managing codevoyant plans, worktrees, and config.

## Installation

```bash
npm install -g @codevoyant/agent-kit
# or use without installing:
npx @codevoyant/agent-kit <command>
```

## Global Options

| Option | Description |
|--------|-------------|
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

## Commands

### `init`

Initialize the `.codevoyant/` directory structure. Creates `plans.json`, `worktrees.json`, `settings.json`, and `plans/` directory. Auto-migrates legacy `codevoyant.json` if found. Worktrees are managed globally at `~/codevoyant/[repo-name]/worktrees/`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir <dir>` | `string` | `.` | Target directory |

```bash
npx @codevoyant/agent-kit init
npx @codevoyant/agent-kit init --dir /path/to/project
```

---

### `plans register`

Register a new plan in the registry.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--plugin <plugin>` | `string` | *(optional)* | Plugin that owns this plan |
| `--description <desc>` | `string` | **(required)** | Plan description |
| `--total <total>` | `string` | `"0"` | Total tasks |
| `--branch <branch>` | `string` | `null` | Associated branch |
| `--worktree <worktree>` | `string` | `null` | Associated worktree path |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans register \
  --name my-feature --plugin spec \
  --description "Add new feature" --total 5
```

---

### `plans update-progress`

Update the progress of an active plan.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--completed <n>` | `string` | **(required)** | Completed tasks |
| `--total <n>` | `string` | *(unchanged)* | Total tasks |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans update-progress --name my-feature --completed 3
```

---

### `plans update-status`

Update the status of an active plan.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--status <status>` | `string` | **(required)** | New status (e.g. `Active`, `Executing`, `Paused`, `Complete`, `Abandoned`) |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans update-status --name my-feature --status Executing
```

---

### `plans archive`

Move an active plan to the archived list.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--status <status>` | `string` | `"Complete"` | Final status |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans archive --name my-feature
```

---

### `plans delete`

Delete a plan from both active and archived lists.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans delete --name my-feature
```

---

### `plans rename`

Rename an active plan and update its path.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Current plan name |
| `--new-name <newName>` | `string` | **(required)** | New plan name |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans rename --name old-name --new-name new-name
```

---

### `plans get`

Get a single plan as JSON. Searches both active and archived plans.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--name <name>` | `string` | **(required)** | Plan name |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans get --name my-feature
```

---

### `plans list`

List plans as JSON.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--status <status>` | `string` | *(all active)* | Filter by status. Special values: `archived` (archived only), `all` (active + archived) |
| `--plugin <plugin>` | `string` | *(any)* | Filter by plugin |
| `--archived` | `boolean` | `false` | Include archived plans |
| `--dir <dir>` | `string` | `.` | Project root directory |

```bash
npx @codevoyant/agent-kit plans list
npx @codevoyant/agent-kit plans list --status Executing --plugin spec
```

---

### `plans migrate`

Migrate legacy `codevoyant.json` to `plans.json` + `worktrees.json`. Splits the combined config into atomic files. The original `codevoyant.json` is preserved.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir <dir>` | `string` | `.` | Directory containing `.codevoyant/` |
| `--registry <path>` | `string` | `.codevoyant/codevoyant.json` | Path to source codevoyant.json |

```bash
npx @codevoyant/agent-kit plans migrate
```

---

### `notify`

Send a cross-platform desktop notification.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--title <title>` | `string` | **(required)** | Notification title |
| `--message <message>` | `string` | **(required)** | Notification message |
| `--silent` | `boolean` | `false` | Suppress notification (no-op) |

```bash
npx @codevoyant/agent-kit notify --title "Build Complete" --message "All tests passed"
```

---

### `worktrees create`

Create a new git worktree at `~/codevoyant/[repo-name]/worktrees/[plan-name]` and register it in the config. The repo name is auto-detected from the git remote URL (or falls back to the directory name).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--branch <branch>` | `string` | **(required)** | Branch name |
| `--base <base>` | `string` | `"HEAD"` | Base branch or commit |
| `--plan <plan>` | `string` | `null` | Associated plan name (used as directory name) |
| `--base-path <path>` | `string` | `~/codevoyant/[repo]/worktrees/` | Custom base path for worktrees |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees create --branch feat/new-thing --plan my-feature
```

---

### `worktrees remove`

Remove a git worktree and unregister it from the config.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--branch <branch>` | `string` | **(required)** | Branch name |
| `--delete-branch` | `boolean` | `false` | Also delete the branch |
| `--force` | `boolean` | `false` | Force removal (even with uncommitted changes) |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees remove --branch feat/new-thing --delete-branch
```

---

### `worktrees prune`

Prune stale worktrees from both git and the config registry.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees prune
```

---

### `worktrees list`

List all git worktrees with enriched information (plan association, dirty status).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | `boolean` | `false` | Output as JSON |
| `--filter <plan>` | `string` | *(none)* | Filter worktrees by plan name (case-insensitive substring match) |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees list
npx @codevoyant/agent-kit worktrees list --json
npx @codevoyant/agent-kit worktrees list --filter my-plan
```

---

### `worktrees export`

Export a plan from a worktree to the main repository. Copies the plan directory and upserts the plan entry in the main repo config.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--plan <plan>` | `string` | *(auto-detected)* | Plan name to export |
| `--force` | `boolean` | `false` | Overwrite existing plan in main repo |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees export --plan my-feature
```

---

### `worktrees register`

Register a worktree in the config registry without performing any git operations.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--branch <branch>` | `string` | **(required)** | Branch name |
| `--path <path>` | `string` | **(required)** | Worktree path |
| `--plan <plan>` | `string` | `null` | Associated plan name |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees register \
  --branch feat/existing --path .codevoyant/worktrees/feat/existing
```

---

### `worktrees unregister`

Remove a worktree from the config registry without performing any git operations.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--branch <branch>` | `string` | **(required)** | Branch name |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees unregister --branch feat/existing
```

---

### `worktrees attach`

Register a manually-created worktree in the config registry. Validates that the path exists and contains a `.git` entry, and auto-detects the branch name.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--path <path>` | `string` | **(required)** | Path to existing worktree |
| `--plan <plan>` | `string` | **(required)** | Associated plan name |
| `--registry <path>` | `string` | `.codevoyant/worktrees.json` | Path to worktrees.json |

```bash
npx @codevoyant/agent-kit worktrees attach --path ~/codevoyant/myrepo/worktrees/my-plan --plan my-plan
```

---

### `worktrees detect`

Print current worktree context as JSON: project root, repo name, branch, whether inside a worktree, and associated plan name.

```bash
npx @codevoyant/agent-kit worktrees detect
```

Example output:
```json
{
  "projectRoot": "/Users/me/projects/myrepo",
  "repoName": "myrepo",
  "branch": "feature-my-plan",
  "isWorktree": true,
  "plan": "my-plan"
}
```

---

### `git repo-name`

Extract the repository name from the git remote URL. Falls back to the project root directory name when no remote is configured.

```bash
npx @codevoyant/agent-kit git repo-name
# → "codevoyant"
```

---

### `git branch`

Get the current branch name, with optional prefix stripping and issue ID removal.

| Option | Description |
|--------|-------------|
| `--clean` | Strip common prefixes: `feature/`, `bugfix/`, `hotfix/`, `fix/`, `release/`, `chore/`, `refactor/` |
| `--strip-issue` | Also strip the leading issue ID (e.g. `ENG-123-`) from the branch name |

```bash
npx @codevoyant/agent-kit git branch
# → "feature/ENG-123-my-feature"

npx @codevoyant/agent-kit git branch --clean
# → "ENG-123-my-feature"

npx @codevoyant/agent-kit git branch --clean --strip-issue
# → "my-feature"
```

Returns `"HEAD"` when in detached HEAD state.

---

### `git issue-id`

Extract an issue ID from the current branch name. Matches the pattern `[A-Z]{2,}[_-][0-9]+` (e.g. `ENG-123`, `LINEAR-456`, `JIRA_789`).

```bash
npx @codevoyant/agent-kit git issue-id
# → "ENG-123"
```

Always exits with code 0. Prints an empty string if no issue ID is found.

---

### `git info`

Return all git metadata as a single JSON object. Useful for skills that need multiple values in one call.

```bash
npx @codevoyant/agent-kit git info
```

Example output:
```json
{
  "repoName": "codevoyant",
  "branch": "feature/ENG-123-my-feature",
  "branchClean": "ENG-123-my-feature",
  "issueId": "ENG-123",
  "isWorktree": false,
  "remoteUrl": "https://github.com/cloudvoyant/codevoyant.git"
}
```

Edge case behaviour:
- **Detached HEAD**: `branch` and `branchClean` return `"HEAD"`, `issueId` is `null`
- **No remote**: `remoteUrl` is `null`, `repoName` falls back to the directory name
- **Not in a git repo**: exits with code 1 and an error message

---

### `task-runner detect`

Detect the active task runner by scanning for config files in priority order, then cache the result in `.codevoyant/settings.json`.

Detection priority:
1. `justfile` / `Justfile` -- runner: `just`
2. `Taskfile.yml` / `Taskfile.yaml` -- runner: `task`
3. `mise.toml` / `.mise.toml` -- runner: `mise run`
4. `Makefile` -- runner: `make`
5. `pyproject.toml` (with `[tool.poe]`) -- runner: `poe`
6. `package.json` (with `scripts`) -- runner: `npm run` / `pnpm run` / `yarn run`

For `package.json`, the command adapts based on lockfile: `pnpm-lock.yaml` selects `pnpm run`, `yarn.lock` selects `yarn run`, otherwise `npm run`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir <dir>` | `string` | `.` | Directory to scan |
| `--settings-dir <dir>` | `string` | `.codevoyant` | Directory for settings.json |

```bash
npx @codevoyant/agent-kit task-runner detect
```

Example output:
```json
{
  "runner": "pnpm",
  "command": "pnpm run",
  "configFile": "package.json",
  "detectedAt": "2026-03-19T20:00:00.000Z",
  "cached": true
}
```

Cache location: `.codevoyant/settings.json` under the `taskRunner` key.

---

### `task-runner list`

List available tasks for the detected (or cached) runner.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | `boolean` | `false` | Output as JSON |
| `--dir <dir>` | `string` | `.` | Directory to scan |
| `--settings-dir <dir>` | `string` | `.codevoyant` | Directory for settings.json |

```bash
npx @codevoyant/agent-kit task-runner list
npx @codevoyant/agent-kit task-runner list --json
```

Structured listing per runner type:
- **just**: `just --dump --dump-format json`
- **mise**: `mise tasks ls --json`
- **task**: `task --list-all --json`
- **make**: parses Makefile targets via `make -pRrq`
- **npm/pnpm/yarn**: reads `scripts` from `package.json`
- **poe**: parses `poe --help` output

---

### `task-runner run`

Run a task using the detected runner. Acts as a proxy that resolves the correct runner invocation.

```bash
npx @codevoyant/agent-kit task-runner run <task> [args...]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir <dir>` | `string` | `.` | Directory to run in |
| `--settings-dir <dir>` | `string` | `.codevoyant` | Directory for settings.json |

```bash
npx @codevoyant/agent-kit task-runner run test
npx @codevoyant/agent-kit task-runner run build --watch
```

If no runner is cached, it runs detection first. Exits with code 1 if the task fails or no runner is found.
