export interface PlanEntry {
  name: string;
  plugin?: string;
  description: string;
  status: 'Active' | 'Executing' | 'Paused' | 'Complete' | 'Abandoned';
  progress: { completed: number; total: number };
  created: string;
  lastUpdated: string;
  path: string;
  branch: string | null;
  worktree: string | null;
}

export interface WorktreeEntry {
  branch: string;
  path: string;
  planName: string | null;
  createdAt: string;
}

export interface PlansFile {
  version: string;
  active: PlanEntry[];
  archived: PlanEntry[];
}

export interface WorktreesFile {
  version: string;
  entries: WorktreeEntry[];
}

/**
 * @deprecated Use PlansFile and WorktreesFile instead.
 * Kept for migration purposes only.
 */
export interface CodevoyantConfig {
  version: string;
  activePlans: PlanEntry[];
  archivedPlans: PlanEntry[];
  worktrees: WorktreeEntry[];
}

export interface TaskRunnerInfo {
  runner: string;
  command: string;
  configFile: string;
  detectedAt: string;
}

export interface MemSettings {
  manifestPath?: string; // default: "mem.json", resolved relative to .codevoyant/
  docsDir?: string;      // default: "docs" — base dir for styleguide/ and recipes/ subdirs
}

export interface CodevoyantSettings {
  notifications?: boolean;
  taskRunner?: TaskRunnerInfo;
  mem?: MemSettings;
  docs?: { types?: string[]; tags?: string[] };
  [key: string]: unknown;
}

export type AgentType = 'claude-code' | 'opencode' | 'vscode-copilot' | 'unknown';
