import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnCLI, mkTmpDir, cleanTmpDir } from './helpers.js';

describe('init command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkTmpDir();
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('should create .codevoyant/ directory structure', () => {
    const result = spawnCLI(['init', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, '.codevoyant', 'plans.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.codevoyant', 'worktrees.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.codevoyant', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.codevoyant', 'plans'))).toBe(true);
  });

  it('should create .gitignore with worktrees entry', () => {
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.codevoyant/worktrees/');
  });

  it('should append to existing .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.codevoyant/worktrees/');
  });

  it('should be idempotent', () => {
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const first = fs.readFileSync(path.join(tmpDir, '.codevoyant', 'plans.json'), 'utf-8');

    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const second = fs.readFileSync(path.join(tmpDir, '.codevoyant', 'plans.json'), 'utf-8');

    expect(first).toBe(second);
  });

  it('should write valid JSON in plans.json', () => {
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const raw = fs.readFileSync(path.join(tmpDir, '.codevoyant', 'plans.json'), 'utf-8');
    const plansData = JSON.parse(raw);
    expect(plansData.version).toBe('1.0');
    expect(plansData.active).toEqual([]);
    expect(plansData.archived).toEqual([]);
  });

  it('should write valid JSON in worktrees.json', () => {
    spawnCLI(['init', '--dir', tmpDir], tmpDir);
    const raw = fs.readFileSync(path.join(tmpDir, '.codevoyant', 'worktrees.json'), 'utf-8');
    const worktreesData = JSON.parse(raw);
    expect(worktreesData.version).toBe('1.0');
    expect(worktreesData.entries).toEqual([]);
  });

  it('should migrate from codevoyant.json when plans.json does not exist', () => {
    // Create a legacy codevoyant.json before running init
    const cvDir = path.join(tmpDir, '.codevoyant');
    fs.mkdirSync(cvDir, { recursive: true });
    const legacyData = {
      version: '1.0',
      activePlans: [
        {
          name: 'migrated-plan',
          plugin: 'spec',
          description: 'Legacy plan',
          status: 'Active',
          progress: { completed: 1, total: 3 },
          created: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:00Z',
          path: '.codevoyant/plans/migrated-plan/',
          branch: null,
          worktree: null,
        },
      ],
      archivedPlans: [],
      worktrees: [{ branch: 'feat/x', path: '/tmp/x', planName: 'migrated-plan', createdAt: '2024-01-01T00:00:00Z' }],
    };
    fs.writeFileSync(path.join(cvDir, 'codevoyant.json'), JSON.stringify(legacyData));

    const result = spawnCLI(['init', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migrated');

    // codevoyant.json should be preserved
    expect(fs.existsSync(path.join(cvDir, 'codevoyant.json'))).toBe(true);

    // plans.json should exist with migrated data
    const plansData = JSON.parse(fs.readFileSync(path.join(cvDir, 'plans.json'), 'utf-8'));
    expect(plansData.active).toHaveLength(1);
    expect(plansData.active[0].name).toBe('migrated-plan');

    // worktrees.json should exist with migrated data
    const worktreesData = JSON.parse(fs.readFileSync(path.join(cvDir, 'worktrees.json'), 'utf-8'));
    expect(worktreesData.entries).toHaveLength(1);
    expect(worktreesData.entries[0].branch).toBe('feat/x');
  });
});
