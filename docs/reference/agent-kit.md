# Library API Reference

`@codevoyant/agent-kit` exports config utilities and TypeScript types for programmatic access to codevoyant state.

## Installation

```bash
npm install @codevoyant/agent-kit
```

## Usage

```ts
import { readConfig, writeConfig, getConfigPath } from '@codevoyant/agent-kit';
import type { CodevoyantConfig, PlanEntry } from '@codevoyant/agent-kit';

const configPath = getConfigPath();
const config = readConfig(configPath);

console.log(config.activePlans);
```

## Functions

### `getConfigPath`

```ts
function getConfigPath(registry?: string): string
```

Returns the resolved path to `codevoyant.json`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `registry` | `string \| undefined` | `undefined` | Custom path. If omitted, returns `.codevoyant/codevoyant.json` |

**Returns:** `string` -- absolute or relative path to the config file.

---

### `readConfig`

```ts
function readConfig(configPath: string): CodevoyantConfig
```

Read and parse a `codevoyant.json` file. Returns the default empty config if the file does not exist.

| Parameter | Type | Description |
|-----------|------|-------------|
| `configPath` | `string` | Path to the config file |

**Returns:** [`CodevoyantConfig`](#codevoyantconfig)

---

### `writeConfig`

```ts
function writeConfig(configPath: string, config: CodevoyantConfig): void
```

Write a config object to disk using atomic write (tmp + rename). Creates parent directories if needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| `configPath` | `string` | Path to the config file |
| `config` | [`CodevoyantConfig`](#codevoyantconfig) | Config object to write |

**Returns:** `void`

---

### `readSettings`

```ts
function readSettings(dir?: string): CodevoyantSettings
```

Read user preferences from `settings.json`. Returns an empty object if the file does not exist.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dir` | `string` | `".codevoyant"` | Directory containing `settings.json` |

**Returns:** [`CodevoyantSettings`](#codevoyantsettings)

---

### `findProjectRoot`

```ts
function findProjectRoot(startDir?: string): string | null
```

Walk up from the given directory (default `cwd`) to find a `.git` directory or file. Returns the project root path, or `null` if not inside a git repository.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDir` | `string` | `process.cwd()` | Directory to start searching from |

**Returns:** `string | null`

---

### `isInWorktree`

```ts
function isInWorktree(startDir?: string): boolean
```

Returns `true` if the current directory is inside a git worktree (not the main working tree). Detection is based on whether `.git` is a file (worktree) rather than a directory (main tree).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDir` | `string` | `process.cwd()` | Directory to check |

**Returns:** `boolean`

---

### `getRepoName`

```ts
function getRepoName(cwd?: string): string
```

Returns the repository name extracted from the git remote URL. Falls back to the basename of the project root directory when no remote is configured.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Working directory |

**Returns:** `string`

---

### `getCurrentPlan`

```ts
function getCurrentPlan(cwd?: string): string | null
```

Returns the plan name associated with the current worktree, if any. Looks up the worktree path in the main repository's `.codevoyant/settings.json` worktreeMap.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Working directory |

**Returns:** `string | null`

---

### `getWorktreeBasePath`

```ts
function getWorktreeBasePath(repoName?: string, cwd?: string): string
```

Returns the global worktree base path for the current repository: `~/codevoyant/[repo-name]/worktrees/`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `repoName` | `string` | auto-detected | Repository name override |
| `cwd` | `string` | `process.cwd()` | Working directory |

**Returns:** `string`

---

### `getWorktreePath`

```ts
function getWorktreePath(planName: string, repoName?: string, cwd?: string): string
```

Returns the full worktree path for a given plan name: `~/codevoyant/[repo-name]/worktrees/[plan-name]`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `planName` | `string` | **(required)** | Plan name |
| `repoName` | `string` | auto-detected | Repository name override |
| `cwd` | `string` | `process.cwd()` | Working directory |

**Returns:** `string`

---

## Types

### `CodevoyantConfig`

Top-level config stored in `.codevoyant/codevoyant.json`.

```ts
interface CodevoyantConfig {
  version: string;          // Schema version (currently "1.0")
  activePlans: PlanEntry[]; // Plans currently in progress
  archivedPlans: PlanEntry[]; // Completed or abandoned plans
  worktrees: WorktreeEntry[]; // Registered git worktrees
}
```

---

### `PlanEntry`

A single plan record.

```ts
interface PlanEntry {
  name: string;             // Unique plan identifier
  plugin: string;           // Owning plugin ("spec", "em", "pm", etc.)
  description: string;      // Human-readable description
  status: 'Active' | 'Executing' | 'Paused' | 'Complete' | 'Abandoned';
  progress: {
    completed: number;      // Tasks completed
    total: number;          // Total tasks
  };
  created: string;          // ISO 8601 timestamp
  lastUpdated: string;      // ISO 8601 timestamp
  path: string;             // Relative path to plan directory
  branch: string | null;    // Associated git branch
  worktree: string | null;  // Associated worktree path
}
```

---

### `WorktreeEntry`

A registered git worktree.

```ts
interface WorktreeEntry {
  branch: string;           // Branch name
  path: string;             // Worktree directory path
  planName: string | null;  // Associated plan name
  createdAt: string;        // ISO 8601 timestamp
}
```

---

### `CodevoyantSettings`

User preferences stored in `.codevoyant/settings.json`.

```ts
interface CodevoyantSettings {
  notifications?: boolean;  // Enable/disable desktop notifications
  defaultPlugin?: string;   // Default plugin for new plans
  [key: string]: unknown;   // Additional user-defined settings
}
```
