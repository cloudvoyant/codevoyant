import { Command } from 'commander';
import type { TaskRunnerInfo } from '../types.js';
/**
 * Detect the task runner by scanning for config files in priority order.
 * Optionally provide a cwd to search from (defaults to process.cwd()).
 */
export declare function detectRunner(cwd?: string): TaskRunnerInfo | null;
interface TaskEntry {
    name: string;
    description?: string;
}
/**
 * List available tasks for a given runner by invoking its list command.
 * If the runner binary is not installed, falls back to showing raw config file content.
 */
export declare function listTasks(info: TaskRunnerInfo, cwd?: string): TaskEntry[];
export declare function taskRunnerCommand(): Command;
export {};
//# sourceMappingURL=task-runner.d.ts.map