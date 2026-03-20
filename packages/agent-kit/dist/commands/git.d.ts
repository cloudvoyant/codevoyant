import { Command } from 'commander';
export declare function gitCommand(): Command;
export { getCurrentBranch, cleanBranch, extractIssueId, stripIssueFromBranch, getRemoteUrl, BRANCH_PREFIXES, ISSUE_ID_PATTERN, };
/** Prefixes that are stripped by --clean. */
declare const BRANCH_PREFIXES: string[];
/** Issue ID pattern: 2+ uppercase letters followed by - or _ and 1+ digits. */
declare const ISSUE_ID_PATTERN: RegExp;
/** Get the current branch name. Returns "HEAD" for detached HEAD state. */
declare function getCurrentBranch(cwd?: string): string;
/** Strip common branch prefixes (feature/, bugfix/, etc.). */
declare function cleanBranch(branch: string): string;
/** Extract issue ID from a branch name. Returns empty string if not found. */
declare function extractIssueId(branch: string): string;
/**
 * Strip the leading issue ID (and trailing separator) from a branch name.
 * E.g. "ENG-123-my-feature" -> "my-feature"
 */
declare function stripIssueFromBranch(branch: string): string;
/** Get the remote URL for origin, or null if no remote. */
declare function getRemoteUrl(cwd?: string): string | null;
//# sourceMappingURL=git.d.ts.map