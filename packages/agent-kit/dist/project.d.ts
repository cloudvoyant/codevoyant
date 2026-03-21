/**
 * Walk up from the given directory (default cwd) to find a .git directory or file.
 * Returns the project root path, or null if not found.
 */
export declare function findProjectRoot(startDir?: string): string | null;
/**
 * Returns true if the current working directory (or startDir) is inside a git worktree
 * (not the main working tree). In a worktree, .git is a file (not a directory)
 * containing a "gitdir:" pointer.
 */
export declare function isInWorktree(startDir?: string): boolean;
/**
 * Returns the repo name from git remote URL, or falls back to the basename
 * of the project root directory.
 *
 * Examples:
 *   git@github.com:owner/repo.git -> "repo"
 *   https://github.com/owner/repo.git -> "repo"
 *   https://github.com/owner/repo -> "repo"
 *   (no remote) -> basename of project root
 */
export declare function getRepoName(cwd?: string): string;
/**
 * Returns the plan name associated with the current worktree, if any.
 * Looks up the worktree path in .codevoyant/worktrees.json.
 */
export declare function getCurrentPlan(cwd?: string): string | null;
/**
 * Returns the global worktree base path for the current repo.
 * Path convention: ~/codevoyant/[repo-name]/worktrees/
 */
export declare function getWorktreeBasePath(repoName?: string, cwd?: string): string;
/**
 * Returns the full worktree path for a given plan name.
 * Path convention: ~/codevoyant/[repo-name]/worktrees/[plan-name]
 */
export declare function getWorktreePath(planName: string, repoName?: string, cwd?: string): string;
//# sourceMappingURL=project.d.ts.map