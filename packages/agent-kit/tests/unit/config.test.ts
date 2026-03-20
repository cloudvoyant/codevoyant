import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readConfig, writeConfig } from '../../src/config.js';

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
});
