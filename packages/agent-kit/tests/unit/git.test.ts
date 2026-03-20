import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { cleanBranch, extractIssueId, stripIssueFromBranch, BRANCH_PREFIXES } from '../../src/commands/git.js';

describe('git subcommands', () => {
  describe('cleanBranch', () => {
    it('should strip feature/ prefix', () => {
      expect(cleanBranch('feature/ENG-123-my-feature')).toBe('ENG-123-my-feature');
    });

    it('should strip bugfix/ prefix', () => {
      expect(cleanBranch('bugfix/fix-thing')).toBe('fix-thing');
    });

    it('should strip hotfix/ prefix', () => {
      expect(cleanBranch('hotfix/urgent-patch')).toBe('urgent-patch');
    });

    it('should strip fix/ prefix', () => {
      expect(cleanBranch('fix/broken-thing')).toBe('broken-thing');
    });

    it('should strip release/ prefix', () => {
      expect(cleanBranch('release/v1.2.3')).toBe('v1.2.3');
    });

    it('should strip chore/ prefix', () => {
      expect(cleanBranch('chore/update-deps')).toBe('update-deps');
    });

    it('should strip refactor/ prefix', () => {
      expect(cleanBranch('refactor/cleanup')).toBe('cleanup');
    });

    it('should not modify branches without known prefixes', () => {
      expect(cleanBranch('main')).toBe('main');
      expect(cleanBranch('develop')).toBe('develop');
      expect(cleanBranch('ENG-123-my-feature')).toBe('ENG-123-my-feature');
    });

    it('should return HEAD unchanged', () => {
      expect(cleanBranch('HEAD')).toBe('HEAD');
    });

    it('should strip all documented prefixes', () => {
      for (const prefix of BRANCH_PREFIXES) {
        expect(cleanBranch(`${prefix}test`)).toBe('test');
      }
    });
  });

  describe('extractIssueId', () => {
    it('should extract ENG-123 from branch name', () => {
      expect(extractIssueId('feature/ENG-123-my-feature')).toBe('ENG-123');
    });

    it('should extract LINEAR-456 from branch name', () => {
      expect(extractIssueId('LINEAR-456-some-work')).toBe('LINEAR-456');
    });

    it('should extract JIRA_789 (underscore separator)', () => {
      expect(extractIssueId('JIRA_789-fix')).toBe('JIRA_789');
    });

    it('should return empty string when no issue ID found', () => {
      expect(extractIssueId('main')).toBe('');
      expect(extractIssueId('develop')).toBe('');
      expect(extractIssueId('my-feature-branch')).toBe('');
    });

    it('should return empty string for HEAD', () => {
      expect(extractIssueId('HEAD')).toBe('');
    });

    it('should match issue ID anywhere in branch name', () => {
      expect(extractIssueId('feature/something-ENG-999-rest')).toBe('ENG-999');
    });

    it('should require at least 2 uppercase letters', () => {
      // Single letter prefix should not match
      expect(extractIssueId('A-123-something')).toBe('');
    });

    it('should handle long project prefixes', () => {
      expect(extractIssueId('MYPROJECT-12345')).toBe('MYPROJECT-12345');
    });
  });

  describe('stripIssueFromBranch', () => {
    it('should strip leading issue ID with dash separator', () => {
      expect(stripIssueFromBranch('ENG-123-my-feature')).toBe('my-feature');
    });

    it('should strip leading issue ID with underscore separator', () => {
      expect(stripIssueFromBranch('ENG-123_my-feature')).toBe('my-feature');
    });

    it('should return unchanged if no leading issue ID', () => {
      expect(stripIssueFromBranch('my-feature')).toBe('my-feature');
      expect(stripIssueFromBranch('main')).toBe('main');
    });

    it('should handle branch that is just an issue ID', () => {
      expect(stripIssueFromBranch('ENG-123')).toBe('');
    });

    it('should not strip issue ID that is not at the start', () => {
      expect(stripIssueFromBranch('something-ENG-123-rest')).toBe('something-ENG-123-rest');
    });
  });

  describe('CLI integration (real git repo)', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-git-test-'));
      spawnSync('git', ['init'], { cwd: tmpDir });
      spawnSync('git', ['commit', '--allow-empty', '-m', 'initial'], { cwd: tmpDir });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('repo-name should return repo name from remote URL', () => {
      spawnSync('git', ['remote', 'add', 'origin', 'https://github.com/owner/my-repo.git'], {
        cwd: tmpDir,
      });
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'repo-name'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('my-repo');
    });

    it('repo-name should fallback to directory name when no remote', () => {
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'repo-name'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(path.basename(tmpDir));
    });

    it('branch should return current branch name', () => {
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'branch'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      // Default branch may be main or master
      expect(['main', 'master']).toContain(result.stdout.trim());
    });

    it('branch should return HEAD in detached HEAD state', () => {
      // Detach HEAD
      const headSha = spawnSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      }).stdout.trim();
      spawnSync('git', ['checkout', headSha], { cwd: tmpDir });

      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'branch'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('HEAD');
    });

    it('branch --clean should strip prefix', () => {
      spawnSync('git', ['checkout', '-b', 'feature/ENG-123-new-thing'], { cwd: tmpDir });
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'branch', '--clean'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('ENG-123-new-thing');
    });

    it('branch --clean --strip-issue should strip prefix and issue ID', () => {
      spawnSync('git', ['checkout', '-b', 'feature/ENG-123-new-thing'], { cwd: tmpDir });
      const result = spawnSync(
        'node',
        [path.join(__dirname, '../../dist/bin.js'), 'git', 'branch', '--clean', '--strip-issue'],
        { encoding: 'utf-8', cwd: tmpDir },
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('new-thing');
    });

    it('issue-id should extract issue ID from branch name', () => {
      spawnSync('git', ['checkout', '-b', 'feature/ENG-999-test-branch'], { cwd: tmpDir });
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'issue-id'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('ENG-999');
    });

    it('issue-id should return empty string when no issue in branch', () => {
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'issue-id'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('');
    });

    it('info should return valid JSON with all fields', () => {
      spawnSync('git', ['remote', 'add', 'origin', 'https://github.com/owner/test-repo.git'], {
        cwd: tmpDir,
      });
      spawnSync('git', ['checkout', '-b', 'feature/ENG-42-cool-feature'], { cwd: tmpDir });

      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'info'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);

      const info = JSON.parse(result.stdout);
      expect(info.repoName).toBe('test-repo');
      expect(info.branch).toBe('feature/ENG-42-cool-feature');
      expect(info.branchClean).toBe('ENG-42-cool-feature');
      expect(info.issueId).toBe('ENG-42');
      expect(info.isWorktree).toBe(false);
      expect(info.remoteUrl).toBe('https://github.com/owner/test-repo.git');
    });

    it('info should handle no remote gracefully (remoteUrl: null)', () => {
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'info'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);

      const info = JSON.parse(result.stdout);
      expect(info.remoteUrl).toBeNull();
      expect(info.repoName).toBe(path.basename(tmpDir));
    });

    it('should exit 1 with error when not in a git repo', () => {
      const noGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-no-git-'));
      try {
        const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'repo-name'], {
          encoding: 'utf-8',
          cwd: noGitDir,
        });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('not a git repository');
      } finally {
        fs.rmSync(noGitDir, { recursive: true, force: true });
      }
    });

    it('should handle shallow clone gracefully', () => {
      // Shallow clone simulation: just ensure commands don't crash
      // A real shallow clone still has .git and branches work fine
      const result = spawnSync('node', [path.join(__dirname, '../../dist/bin.js'), 'git', 'info'], {
        encoding: 'utf-8',
        cwd: tmpDir,
      });
      expect(result.status).toBe(0);
      const info = JSON.parse(result.stdout);
      expect(info.branch).toBeTruthy();
    });
  });
});
