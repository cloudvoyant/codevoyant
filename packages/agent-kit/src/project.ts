import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readWorktrees } from './config.js';

/**
 * Walk up from the given directory (default cwd) to find a .git directory or file.
 * Returns the project root path, or null if not found.
 */
export function findProjectRoot(startDir?: string): string | null {
  let dir = path.resolve(startDir ?? process.cwd());
  const root = path.parse(dir).root;

  while (dir !== root) {
    const gitPath = path.join(dir, '.git');
    if (fs.existsSync(gitPath)) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Returns true if the current working directory (or startDir) is inside a git worktree
 * (not the main working tree). In a worktree, .git is a file (not a directory)
 * containing a "gitdir:" pointer.
 */
export function isInWorktree(startDir?: string): boolean {
  const projectRoot = findProjectRoot(startDir);
  if (!projectRoot) return false;

  const gitPath = path.join(projectRoot, '.git');
  try {
    const stat = fs.statSync(gitPath);
    // In a worktree, .git is a file; in the main tree, it's a directory
    return stat.isFile();
  } catch {
    return false;
  }
}

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
export function getRepoName(cwd?: string): string {
  const effectiveCwd = cwd ?? process.cwd();

  try {
    const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
      cwd: effectiveCwd,
    });

    if (result.status === 0 && result.stdout?.trim()) {
      const url = result.stdout.trim();
      // Handle SSH: git@github.com:owner/repo.git
      // Handle HTTPS: https://github.com/owner/repo.git
      const name = url
        .replace(/\.git$/, '')
        .split('/')
        .pop()
        ?.split(':')
        .pop();
      if (name) return name;
    }
  } catch {
    // Fall through to directory name fallback
  }

  // Fallback: basename of project root or cwd
  const projectRoot = findProjectRoot(effectiveCwd);
  return path.basename(projectRoot ?? effectiveCwd);
}

/**
 * Returns the plan name associated with the current worktree, if any.
 * Looks up the worktree path in .codevoyant/worktrees.json.
 */
export function getCurrentPlan(cwd?: string): string | null {
  const effectiveCwd = path.resolve(cwd ?? process.cwd());
  const projectRoot = findProjectRoot(effectiveCwd);
  if (!projectRoot) return null;

  // Try to find the main repo root (via git common dir)
  try {
    const result = spawnSync('git', ['rev-parse', '--git-common-dir'], {
      encoding: 'utf-8',
      cwd: effectiveCwd,
    });

    if (result.status === 0 && result.stdout?.trim()) {
      const commonDir = path.resolve(effectiveCwd, result.stdout.trim());
      const mainRoot = path.dirname(commonDir);
      const cvDir = path.join(mainRoot, '.codevoyant');

      const worktreesData = readWorktrees(cvDir);
      const entry = worktreesData.entries.find((e) => e.path === effectiveCwd);
      if (entry) {
        return entry.planName ?? null;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Returns the global worktree base path for the current repo.
 * Path convention: ~/codevoyant/[repo-name]/worktrees/
 */
export function getWorktreeBasePath(repoName?: string, cwd?: string): string {
  const name = repoName ?? getRepoName(cwd);
  return path.join(os.homedir(), 'codevoyant', name, 'worktrees');
}

/**
 * Returns the full worktree path for a given plan name.
 * Path convention: ~/codevoyant/[repo-name]/worktrees/[plan-name]
 */
export function getWorktreePath(planName: string, repoName?: string, cwd?: string): string {
  return path.join(getWorktreeBasePath(repoName, cwd), planName);
}
