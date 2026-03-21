import type { CodevoyantConfig, CodevoyantSettings, PlansFile, WorktreesFile } from './types.js';
/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export declare function getConfigPath(registry?: string): string;
/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export declare function readConfig(configPath: string): CodevoyantConfig;
/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export declare function writeConfig(configPath: string, config: CodevoyantConfig): void;
export declare function readSettings(dir?: string): CodevoyantSettings;
export declare function writeSettings(settings: CodevoyantSettings, dir?: string): void;
export declare function readPlans(dir?: string): PlansFile;
export declare function writePlans(plans: PlansFile, dir?: string): void;
export declare function readWorktrees(dir?: string): WorktreesFile;
export declare function writeWorktrees(worktrees: WorktreesFile, dir?: string): void;
//# sourceMappingURL=config.d.ts.map