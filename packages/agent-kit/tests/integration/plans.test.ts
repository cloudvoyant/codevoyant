import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnCLI, mkTmpDir, cleanTmpDir } from './helpers.js';

describe('plans command', () => {
  let tmpDir: string;
  let registryPath: string;

  beforeEach(() => {
    tmpDir = mkTmpDir();
    registryPath = path.join(tmpDir, '.codevoyant', 'plans.json');
    // Initialize
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  describe('register', () => {
    it('should register a new plan', () => {
      const result = spawnCLI(
        [
          'plans',
          'register',
          '--name',
          'test-plan',
          '--plugin',
          'spec',
          '--description',
          'A test',
          '--total',
          '5',
          '--dir',
          tmpDir,
        ],
        tmpDir,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Registered plan: test-plan');

      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active).toHaveLength(1);
      expect(plansData.active[0].name).toBe('test-plan');
      expect(plansData.active[0].plugin).toBe('spec');
      expect(plansData.active[0].progress.total).toBe(5);
    });

    it('should reject duplicate plan names', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'dup', '--plugin', 'spec', '--description', 'First', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(
        ['plans', 'register', '--name', 'dup', '--plugin', 'spec', '--description', 'Second', '--dir', tmpDir],
        tmpDir,
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('already exists');
    });
  });

  describe('update-progress', () => {
    it('should update progress', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'prog', '--plugin', 'spec', '--description', 'Test', '--total', '10', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(
        ['plans', 'update-progress', '--name', 'prog', '--completed', '3', '--dir', tmpDir],
        tmpDir,
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('3/10');
    });

    it('should update total when provided', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'prog2', '--plugin', 'spec', '--description', 'Test', '--total', '5', '--dir', tmpDir],
        tmpDir,
      );
      spawnCLI(
        ['plans', 'update-progress', '--name', 'prog2', '--completed', '2', '--total', '8', '--dir', tmpDir],
        tmpDir,
      );
      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active[0].progress).toEqual({ completed: 2, total: 8 });
    });
  });

  describe('update-status', () => {
    it('should update status', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'stat', '--plugin', 'spec', '--description', 'Test', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(
        ['plans', 'update-status', '--name', 'stat', '--status', 'Executing', '--dir', tmpDir],
        tmpDir,
      );
      expect(result.status).toBe(0);
      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active[0].status).toBe('Executing');
    });
  });

  describe('archive', () => {
    it('should move plan from active to archived', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'arch', '--plugin', 'spec', '--description', 'Test', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(['plans', 'archive', '--name', 'arch', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);

      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active).toHaveLength(0);
      expect(plansData.archived).toHaveLength(1);
      expect(plansData.archived[0].name).toBe('arch');
      expect(plansData.archived[0].status).toBe('Complete');
    });
  });

  describe('delete', () => {
    it('should delete from active plans', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'del', '--plugin', 'spec', '--description', 'Test', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(['plans', 'delete', '--name', 'del', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);

      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active).toHaveLength(0);
    });

    it('should error on nonexistent plan', () => {
      const result = spawnCLI(['plans', 'delete', '--name', 'nope', '--dir', tmpDir], tmpDir);
      expect(result.status).not.toBe(0);
    });
  });

  describe('rename', () => {
    it('should rename a plan', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'old-name', '--plugin', 'spec', '--description', 'Test', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(
        ['plans', 'rename', '--name', 'old-name', '--new-name', 'new-name', '--dir', tmpDir],
        tmpDir,
      );
      expect(result.status).toBe(0);

      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active[0].name).toBe('new-name');
      expect(plansData.active[0].path).toContain('new-name');
    });
  });

  describe('get', () => {
    it('should print plan as JSON', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'get-me', '--plugin', 'spec', '--description', 'Test', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(['plans', 'get', '--name', 'get-me', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);

      const plan = JSON.parse(result.stdout);
      expect(plan.name).toBe('get-me');
    });

    it('should error on nonexistent plan', () => {
      const result = spawnCLI(['plans', 'get', '--name', 'nope', '--dir', tmpDir], tmpDir);
      expect(result.status).not.toBe(0);
    });
  });

  describe('list', () => {
    it('should list active plans as JSON', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'p1', '--plugin', 'spec', '--description', 'A', '--dir', tmpDir],
        tmpDir,
      );
      spawnCLI(
        ['plans', 'register', '--name', 'p2', '--plugin', 'pm', '--description', 'B', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(['plans', 'list', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);

      const plans = JSON.parse(result.stdout);
      expect(plans).toHaveLength(2);
    });

    it('should filter by status case-insensitively', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'p1', '--plugin', 'spec', '--description', 'A', '--dir', tmpDir],
        tmpDir,
      );
      const lowercase = spawnCLI(['plans', 'list', '--status', 'active', '--dir', tmpDir], tmpDir);
      expect(lowercase.status).toBe(0);
      const lowercasePlans = JSON.parse(lowercase.stdout);
      expect(lowercasePlans).toHaveLength(1);
      expect(lowercasePlans[0].name).toBe('p1');

      const exact = spawnCLI(['plans', 'list', '--status', 'Active', '--dir', tmpDir], tmpDir);
      expect(exact.status).toBe(0);
      const exactPlans = JSON.parse(exact.stdout);
      expect(exactPlans).toHaveLength(1);
      expect(exactPlans[0].name).toBe('p1');

      const upper = spawnCLI(['plans', 'list', '--status', 'ACTIVE', '--dir', tmpDir], tmpDir);
      expect(upper.status).toBe(0);
      const upperPlans = JSON.parse(upper.stdout);
      expect(upperPlans).toHaveLength(1);
      expect(upperPlans[0].name).toBe('p1');
    });

    it('should filter by plugin', () => {
      spawnCLI(
        ['plans', 'register', '--name', 'p1', '--plugin', 'spec', '--description', 'A', '--dir', tmpDir],
        tmpDir,
      );
      spawnCLI(
        ['plans', 'register', '--name', 'p2', '--plugin', 'pm', '--description', 'B', '--dir', tmpDir],
        tmpDir,
      );
      const result = spawnCLI(['plans', 'list', '--plugin', 'pm', '--dir', tmpDir], tmpDir);
      const plans = JSON.parse(result.stdout);
      expect(plans).toHaveLength(1);
      expect(plans[0].plugin).toBe('pm');
    });
  });

  describe('migrate', () => {
    it('should migrate codevoyant.json to plans.json + worktrees.json', () => {
      // Remove existing plans.json first
      fs.unlinkSync(registryPath);
      // Also remove worktrees.json
      const worktreesPath = path.join(tmpDir, '.codevoyant', 'worktrees.json');
      if (fs.existsSync(worktreesPath)) fs.unlinkSync(worktreesPath);

      // Create a legacy codevoyant.json
      const legacyData = {
        version: '1.0',
        activePlans: [
          {
            name: 'legacy-plan',
            plugin: 'spec',
            description: 'From codevoyant.json',
            status: 'Active',
            progress: { completed: 0, total: 3 },
            created: '2024-01-01T00:00:00Z',
            lastUpdated: '2024-01-01T00:00:00Z',
            path: '.codevoyant/plans/legacy-plan/',
            branch: null,
            worktree: null,
          },
        ],
        archivedPlans: [],
        worktrees: [{ branch: 'feat/test', path: '/tmp/test-wt', planName: 'legacy-plan', createdAt: '2024-01-01T00:00:00Z' }],
      };
      fs.writeFileSync(path.join(tmpDir, '.codevoyant', 'codevoyant.json'), JSON.stringify(legacyData));

      const result = spawnCLI(['plans', 'migrate', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Migrated');

      const plansData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      expect(plansData.active).toHaveLength(1);
      expect(plansData.active[0].name).toBe('legacy-plan');
      expect(plansData.archived).toEqual([]);

      const worktreesData = JSON.parse(fs.readFileSync(worktreesPath, 'utf-8'));
      expect(worktreesData.entries).toHaveLength(1);
      expect(worktreesData.entries[0].branch).toBe('feat/test');
    });

    it('should no-op if plans.json already exists', () => {
      const result = spawnCLI(['plans', 'migrate', '--dir', tmpDir], tmpDir);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('already exists');
    });
  });
});
