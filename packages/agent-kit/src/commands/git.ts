import { Command } from 'commander';
import { spawnSync } from 'child_process';
import { findProjectRoot, getRepoName, isInWorktree } from '../project.js';

export function gitCommand(): Command {
  const git = new Command('git').description('Git metadata extraction');

  git
    .command('repo-name')
    .description('Get repository name from remote URL (fallback to directory name)')
    .action(() => {
      requireGitRepo();
      console.log(getRepoName());
    });

  git
    .command('branch')
    .description('Get current branch name')
    .option('--clean', 'Strip common prefixes (feature/, bugfix/, etc.)')
    .option('--strip-issue', 'Also strip leading issue ID (use with --clean)')
    .action((opts) => {
      requireGitRepo();
      let branch = getCurrentBranch();

      if (opts.clean) {
        branch = cleanBranch(branch);
      }
      if (opts.stripIssue) {
        branch = stripIssueFromBranch(branch);
      }

      console.log(branch);
    });

  git
    .command('issue-id')
    .description('Extract issue ID (e.g. ENG-123) from current branch name')
    .action(() => {
      requireGitRepo();
      const branch = getCurrentBranch();
      const issueId = extractIssueId(branch);
      // Always exit 0, print empty string if no issue ID
      console.log(issueId);
    });

  git
    .command('info')
    .description('All git metadata as JSON')
    .action(() => {
      requireGitRepo();
      const branch = getCurrentBranch();
      const branchClean = cleanBranch(branch);
      const issueId = extractIssueId(branch);
      const remoteUrl = getRemoteUrl();
      const repoName = getRepoName();
      const inWorktree = isInWorktree();

      const info = {
        repoName,
        branch,
        branchClean,
        issueId: issueId || null,
        isWorktree: inWorktree,
        remoteUrl: remoteUrl || null,
      };

      console.log(JSON.stringify(info, null, 2));
    });

  return git;
}

// Export internals for testing
export {
  getCurrentBranch,
  cleanBranch,
  extractIssueId,
  stripIssueFromBranch,
  getRemoteUrl,
  BRANCH_PREFIXES,
  ISSUE_ID_PATTERN,
};

// HELPERS -----------------------------------------------------------------------------------------

/** Prefixes that are stripped by --clean. */
const BRANCH_PREFIXES = ['feature/', 'bugfix/', 'hotfix/', 'fix/', 'release/', 'chore/', 'refactor/'];

/** Issue ID pattern: 2+ uppercase letters followed by - or _ and 1+ digits. */
const ISSUE_ID_PATTERN = /[A-Z]{2,}[_-][0-9]+/;

/** Run a git command and return trimmed stdout. Returns null on failure. */
function gitOrNull(args: string[], cwd?: string): string | null {
  const result = spawnSync('git', args, { encoding: 'utf-8', cwd });
  if (result.status !== 0) return null;
  return result.stdout?.trim() ?? null;
}

/** Require that we're inside a git repo. Exits with code 1 if not. */
function requireGitRepo(): string {
  const root = findProjectRoot();
  if (!root) {
    console.error('fatal: not a git repository (or any parent up to mount point /)');
    process.exit(1);
  }
  return root;
}

/** Get the current branch name. Returns "HEAD" for detached HEAD state. */
function getCurrentBranch(cwd?: string): string {
  const branch = gitOrNull(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  return branch || 'HEAD';
}

/** Strip common branch prefixes (feature/, bugfix/, etc.). */
function cleanBranch(branch: string): string {
  for (const prefix of BRANCH_PREFIXES) {
    if (branch.startsWith(prefix)) {
      return branch.slice(prefix.length);
    }
  }
  return branch;
}

/** Extract issue ID from a branch name. Returns empty string if not found. */
function extractIssueId(branch: string): string {
  const match = branch.match(ISSUE_ID_PATTERN);
  return match ? match[0] : '';
}

/**
 * Strip the leading issue ID (and trailing separator) from a branch name.
 * E.g. "ENG-123-my-feature" -> "my-feature"
 */
function stripIssueFromBranch(branch: string): string {
  return branch.replace(/^[A-Z]{2,}[_-][0-9]+[-_]?/, '');
}

/** Get the remote URL for origin, or null if no remote. */
function getRemoteUrl(cwd?: string): string | null {
  return gitOrNull(['remote', 'get-url', 'origin'], cwd);
}
