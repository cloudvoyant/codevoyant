import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readConfig, writeConfig, readSettings, readPlans, writePlans, readWorktrees, writeWorktrees } from '../../src/config.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('writeConfig', () => {
    it('should not leave a .tmp file after writing', () => {
      const configPath = path.join(tmpDir, 'codevoyant.json');
      const config = readConfig(configPath);
      writeConfig(configPath, config);

      expect(fs.existsSync(configPath)).toBe(true);
      expect(fs.existsSync(`${configPath}.tmp`)).toBe(false);
    });

    it('should create missing parent directories', () => {
      const configPath = path.join(tmpDir, 'nested', 'deep', 'codevoyant.json');
      const config = readConfig(configPath);
      writeConfig(configPath, config);

      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should write valid JSON', () => {
      const configPath = path.join(tmpDir, 'codevoyant.json');
      const config = readConfig(configPath);
      writeConfig(configPath, config);

      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.version).toBe('1.0');
      expect(parsed.activePlans).toEqual([]);
    });
  });

  describe('readConfig', () => {
    it('should return default config when file does not exist', () => {
      const config = readConfig(path.join(tmpDir, 'nonexistent.json'));
      expect(config.version).toBe('1.0');
      expect(config.activePlans).toEqual([]);
      expect(config.archivedPlans).toEqual([]);
      expect(config.worktrees).toEqual([]);
    });

    it('should throw on corrupt JSON', () => {
      const configPath = path.join(tmpDir, 'corrupt.json');
      fs.writeFileSync(configPath, '{not valid json');

      expect(() => readConfig(configPath)).toThrow();
    });

    it('should read back written config', () => {
      const configPath = path.join(tmpDir, 'codevoyant.json');
      const config = readConfig(configPath);
      config.activePlans.push({
        name: 'test',
        plugin: 'spec',
        description: 'A test plan',
        status: 'Active',
        progress: { completed: 1, total: 5 },
        created: '2024-01-01T00:00:00Z',
        lastUpdated: '2024-01-01T00:00:00Z',
        path: '.codevoyant/plans/test/',
        branch: null,
        worktree: null,
      });
      writeConfig(configPath, config);

      const reread = readConfig(configPath);
      expect(reread.activePlans).toHaveLength(1);
      expect(reread.activePlans[0].name).toBe('test');
    });
  });

  describe('readSettings', () => {
    it('should auto-create settings.json when missing', () => {
      const settingsPath = path.join(tmpDir, 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(false);

      const result = readSettings(tmpDir);
      expect(result).toEqual({});
      expect(fs.existsSync(settingsPath)).toBe(true);

      const raw = fs.readFileSync(settingsPath, 'utf-8');
      expect(JSON.parse(raw)).toEqual({});
    });

    it('should read existing settings.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'settings.json'), JSON.stringify({ taskRunner: { runner: 'pnpm', command: 'pnpm run', configFile: 'package.json', detectedAt: '2024-01-01' } }));
      const result = readSettings(tmpDir);
      expect(result.taskRunner?.runner).toBe('pnpm');
    });
  });

  describe('readPlans / writePlans', () => {
    it('should return default when file does not exist', () => {
      const result = readPlans(tmpDir);
      expect(result.version).toBe('1.0');
      expect(result.active).toEqual([]);
      expect(result.archived).toEqual([]);
    });

    it('should write and read back plans', () => {
      writePlans(
        {
          version: '1.0',
          active: [
            {
              name: 'my-plan',
              description: 'Test',
              status: 'Active',
              progress: { completed: 0, total: 3 },
              created: '2024-01-01T00:00:00Z',
              lastUpdated: '2024-01-01T00:00:00Z',
              path: '.codevoyant/plans/my-plan/',
              branch: null,
              worktree: null,
            },
          ],
          archived: [],
        },
        tmpDir,
      );

      const result = readPlans(tmpDir);
      expect(result.active).toHaveLength(1);
      expect(result.active[0].name).toBe('my-plan');
      expect(result.archived).toEqual([]);
    });

    it('should not leave a .tmp file after writing', () => {
      writePlans({ version: '1.0', active: [], archived: [] }, tmpDir);
      expect(fs.existsSync(path.join(tmpDir, 'plans.json.tmp'))).toBe(false);
    });
  });

  describe('readWorktrees / writeWorktrees', () => {
    it('should return default when file does not exist', () => {
      const result = readWorktrees(tmpDir);
      expect(result.version).toBe('1.0');
      expect(result.entries).toEqual([]);
    });

    it('should write and read back worktrees', () => {
      writeWorktrees(
        {
          version: '1.0',
          entries: [
            {
              branch: 'feat/test',
              path: '/tmp/test-wt',
              planName: 'my-plan',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        },
        tmpDir,
      );

      const result = readWorktrees(tmpDir);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].branch).toBe('feat/test');
      expect(result.entries[0].planName).toBe('my-plan');
    });

    it('should not leave a .tmp file after writing', () => {
      writeWorktrees({ version: '1.0', entries: [] }, tmpDir);
      expect(fs.existsSync(path.join(tmpDir, 'worktrees.json.tmp'))).toBe(false);
    });
  });
});
