import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnCLI, mkTmpDir, cleanTmpDir, initGitRepo } from './helpers.js';

describe('worktrees command', () => {
  let tmpDir: string;
  let registryPath: string;
  let globalWorktreeBase: string;

  beforeEach(() => {
    tmpDir = mkTmpDir();
    initGitRepo(tmpDir);
    // Initialize codevoyant
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    registryPath = path.join(tmpDir, '.codevoyant', 'worktrees.json');
    // Global worktree base: ~/codevoyant/[repo-name]/worktrees/
    // repo-name falls back to tmpDir basename since there's no remote
    const repoName = path.basename(tmpDir);
    globalWorktreeBase = path.join(os.homedir(), 'codevoyant', repoName, 'worktrees');
  });

  afterEach(() => {
    // Clean up global worktree directory if created
    if (fs.existsSync(globalWorktreeBase)) {
      fs.rmSync(path.dirname(globalWorktreeBase), { recursive: true, force: true });
    }
    cleanTmpDir(tmpDir);
  });

  describe('register', () => {
    it('should register a worktree in the registry', () => {
      const result = spawnCLI(
        [
          'worktrees',
          'register',
          '--branch',
          'feat/test',
          '--path',
          '/tmp/wt',
          '--plan',
          'my-plan',
          '--registry',
          registryPath,
        ],
        tmpDir,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Registered worktree: feat/test');

      const worktreesData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(1);
      expect(worktreesData.entries[0].branch).toBe('feat/test');
      expect(worktreesData.entries[0].planName).toBe('my-plan');
    });
  });

  describe('unregister', () => {
    it('should unregister a worktree from the registry', () => {
      spawnCLI(
        ['worktrees', 'register', '--branch', 'feat/rm', '--path', '/tmp/wt', '--registry', registryPath],
        tmpDir,
      );
      const result = spawnCLI(['worktrees', 'unregister', '--branch', 'feat/rm', '--registry', registryPath], tmpDir);
      expect(result.status).toBe(0);

      const worktreesData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(0);
    });

    it('should error on nonexistent branch', () => {
      const result = spawnCLI(['worktrees', 'unregister', '--branch', 'nope', '--registry', registryPath], tmpDir);
      expect(result.status).not.toBe(0);
    });
  });

  describe('create', () => {
    it('should create a worktree and register it', () => {
      const result = spawnCLI(['worktrees', 'create', '--branch', 'feat-wt-test', '--registry', registryPath], tmpDir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Worktree created');

      // Worktree is now at the global path: ~/codevoyant/[repo-name]/worktrees/feat-wt-test
      const wtPath = path.join(globalWorktreeBase, 'feat-wt-test');
      expect(fs.existsSync(wtPath)).toBe(true);

      const worktreesData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(1);
      expect(worktreesData.entries[0].branch).toBe('feat-wt-test');
      expect(worktreesData.entries[0].path).toBe(wtPath);
    });

    it('should reject invalid branch names', () => {
      const result = spawnCLI(['worktrees', 'create', '--branch', 'bad branch!', '--registry', registryPath], tmpDir);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Invalid branch name');
    });
  });

  describe('remove', () => {
    it('should remove a worktree and unregister it', () => {
      spawnCLI(['worktrees', 'create', '--branch', 'feat-rm-test', '--registry', registryPath], tmpDir);

      const result = spawnCLI(['worktrees', 'remove', '--branch', 'feat-rm-test', '--registry', registryPath], tmpDir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Removed worktree: feat-rm-test');

      const worktreesData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(0);
    });

    it('should remove worktree and delete branch with --delete-branch', () => {
      spawnCLI(['worktrees', 'create', '--branch', 'feat-del-branch', '--registry', registryPath], tmpDir);

      const result = spawnCLI(
        [
          'worktrees',
          'remove',
          '--branch',
          'feat-del-branch',
          '--delete-branch',
          '--force',
          '--registry',
          registryPath,
        ],
        tmpDir,
      );
      expect(result.status).toBe(0);
    });
  });

  describe('prune', () => {
    it('should prune stale worktree entries', () => {
      // Register a fake worktree that does not exist on disk
      spawnCLI(
        [
          'worktrees',
          'register',
          '--branch',
          'stale',
          '--path',
          '/tmp/nonexistent-wt-path',
          '--registry',
          registryPath,
        ],
        tmpDir,
      );

      const result = spawnCLI(['worktrees', 'prune', '--registry', registryPath], tmpDir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Pruned 1 stale worktree entries');

      const worktreesData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('should list worktrees as JSON', () => {
      const result = spawnCLI(['worktrees', 'list', '--json', '--registry', registryPath], tmpDir);
      expect(result.status).toBe(0);

      const list = JSON.parse(result.stdout);
      expect(Array.isArray(list)).toBe(true);
      // At minimum, the main worktree should be listed
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });
});
