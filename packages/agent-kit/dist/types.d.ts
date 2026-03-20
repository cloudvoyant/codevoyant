export interface PlanEntry {
    name: string;
    plugin: 'spec' | 'em' | 'pm' | string;
    description: string;
    status: 'Active' | 'Executing' | 'Paused' | 'Complete' | 'Abandoned';
    progress: {
        completed: number;
        total: number;
    };
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
export interface CodevoyantSettings {
    notifications?: boolean;
    defaultPlugin?: string;
    taskRunner?: TaskRunnerInfo;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map