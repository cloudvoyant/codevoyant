import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectRunner, listTasks } from '../../src/commands/task-runner.js';
import { readSettings, writeSettings } from '../../src/config.js';

describe('task-runner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-taskrunner-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('detectRunner', () => {
    it('should return null when no config files exist', () => {
      const result = detectRunner(tmpDir);
      expect(result).toBeNull();
    });

    it('should detect justfile', () => {
      fs.writeFileSync(path.join(tmpDir, 'justfile'), 'default:\n\techo hello\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('just');
      expect(result!.command).toBe('just');
      expect(result!.configFile).toBe('justfile');
    });

    it('should detect Justfile (capitalized)', () => {
      fs.writeFileSync(path.join(tmpDir, 'Justfile'), 'default:\n\techo hello\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('just');
    });

    it('should detect Taskfile.yml', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'Taskfile.yml'),
        'version: 3\ntasks:\n  default:\n    cmds:\n      - echo hello\n',
      );
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('task');
      expect(result!.command).toBe('task');
      expect(result!.configFile).toBe('Taskfile.yml');
    });

    it('should detect Taskfile.yaml', () => {
      fs.writeFileSync(path.join(tmpDir, 'Taskfile.yaml'), 'version: 3\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('task');
      expect(result!.configFile).toBe('Taskfile.yaml');
    });

    it('should detect mise.toml', () => {
      fs.writeFileSync(path.join(tmpDir, 'mise.toml'), '[tasks.test]\nrun = "echo test"\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('mise');
      expect(result!.command).toBe('mise run');
      expect(result!.configFile).toBe('mise.toml');
    });

    it('should detect .mise.toml', () => {
      fs.writeFileSync(path.join(tmpDir, '.mise.toml'), '[tasks.test]\nrun = "echo test"\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('mise');
      expect(result!.configFile).toBe('.mise.toml');
    });

    it('should detect Makefile', () => {
      fs.writeFileSync(path.join(tmpDir, 'Makefile'), 'test:\n\techo test\n');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('make');
      expect(result!.command).toBe('make');
      // On case-insensitive filesystems (macOS), 'makefile' check matches 'Makefile'
      expect(['makefile', 'Makefile']).toContain(result!.configFile);
    });

    it('should detect package.json with scripts', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { test: 'vitest', build: 'tsc' } }),
      );
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('npm');
      expect(result!.command).toBe('npm run');
      expect(result!.configFile).toBe('package.json');
    });

    it('should skip package.json without scripts', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      const result = detectRunner(tmpDir);
      expect(result).toBeNull();
    });

    it('should skip package.json with empty scripts', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', scripts: {} }));
      const result = detectRunner(tmpDir);
      expect(result).toBeNull();
    });

    it('should detect pnpm when pnpm-lock.yaml exists', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { test: 'vitest' } }),
      );
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('pnpm');
      expect(result!.command).toBe('pnpm run');
    });

    it('should detect yarn when yarn.lock exists', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { test: 'vitest' } }),
      );
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      const result = detectRunner(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.runner).toBe('yarn');
      expect(result!.command).toBe('yarn run');
    });

    // Priority order tests
    it('should prefer justfile over Taskfile.yml', () => {
      fs.writeFileSync(path.join(tmpDir, 'justfile'), 'default:\n\techo hello\n');
      fs.writeFileSync(path.join(tmpDir, 'Taskfile.yml'), 'version: 3\n');
      const result = detectRunner(tmpDir);
      expect(result!.runner).toBe('just');
    });

    it('should prefer Taskfile.yml over mise.toml', () => {
      fs.writeFileSync(path.join(tmpDir, 'Taskfile.yml'), 'version: 3\n');
      fs.writeFileSync(path.join(tmpDir, 'mise.toml'), '[tasks]\n');
      const result = detectRunner(tmpDir);
      expect(result!.runner).toBe('task');
    });

    it('should prefer mise.toml over Makefile', () => {
      fs.writeFileSync(path.join(tmpDir, 'mise.toml'), '[tasks]\n');
      fs.writeFileSync(path.join(tmpDir, 'Makefile'), 'test:\n\techo test\n');
      const result = detectRunner(tmpDir);
      expect(result!.runner).toBe('mise');
    });

    it('should prefer Makefile over package.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'Makefile'), 'test:\n\techo test\n');
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', scripts: { test: 'vitest' } }),
      );
      const result = detectRunner(tmpDir);
      expect(result!.runner).toBe('make');
    });

    it('should include detectedAt timestamp', () => {
      fs.writeFileSync(path.join(tmpDir, 'Makefile'), 'test:\n\techo test\n');
      const result = detectRunner(tmpDir);
      expect(result!.detectedAt).toBeTruthy();
      // Should be a valid ISO 8601 date
      expect(() => new Date(result!.detectedAt)).not.toThrow();
    });
  });

  describe('listTasks', () => {
    it('should list tasks from package.json for npm runner', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          scripts: { test: 'vitest', build: 'tsc', lint: 'eslint .' },
        }),
      );

      const info = {
        runner: 'npm',
        command: 'npm run',
        configFile: 'package.json',
        detectedAt: new Date().toISOString(),
      };

      const tasks = listTasks(info, tmpDir);
      expect(tasks).toHaveLength(3);
      expect(tasks.map((t) => t.name)).toEqual(['test', 'build', 'lint']);
      expect(tasks[0].description).toBe('vitest');
    });

    it('should list tasks from package.json for pnpm runner', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', scripts: { dev: 'vite' } }));

      const info = {
        runner: 'pnpm',
        command: 'pnpm run',
        configFile: 'package.json',
        detectedAt: new Date().toISOString(),
      };

      const tasks = listTasks(info, tmpDir);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('dev');
    });

    it('should return empty array for unknown runner', () => {
      const info = {
        runner: 'unknown',
        command: 'unknown',
        configFile: 'unknown',
        detectedAt: new Date().toISOString(),
      };

      const tasks = listTasks(info, tmpDir);
      expect(tasks).toEqual([]);
    });

    it('should return empty array when package.json does not exist for npm runner', () => {
      const info = {
        runner: 'npm',
        command: 'npm run',
        configFile: 'package.json',
        detectedAt: new Date().toISOString(),
      };

      const tasks = listTasks(info, tmpDir);
      expect(tasks).toEqual([]);
    });
  });

  // Binary-missing fallback tests live in task-runner-fallback.test.ts
  // (requires vi.mock at module level to mock named execSync import)

  describe('cache (writeSettings/readSettings)', () => {
    it('should write taskRunner to settings.json', () => {
      const settingsDir = path.join(tmpDir, '.codevoyant');
      const info = {
        runner: 'just',
        command: 'just',
        configFile: 'justfile',
        detectedAt: '2026-03-19T20:00:00Z',
      };

      const settings = readSettings(settingsDir);
      settings.taskRunner = info;
      writeSettings(settings, settingsDir);

      const reread = readSettings(settingsDir);
      expect(reread.taskRunner).toEqual(info);
    });

    it('should preserve existing settings when adding taskRunner', () => {
      const settingsDir = path.join(tmpDir, '.codevoyant');
      fs.mkdirSync(settingsDir, { recursive: true });
      fs.writeFileSync(
        path.join(settingsDir, 'settings.json'),
        JSON.stringify({ notifications: true, defaultPlugin: 'spec' }),
      );

      const settings = readSettings(settingsDir);
      settings.taskRunner = {
        runner: 'make',
        command: 'make',
        configFile: 'Makefile',
        detectedAt: '2026-03-19T20:00:00Z',
      };
      writeSettings(settings, settingsDir);

      const reread = readSettings(settingsDir);
      expect(reread.notifications).toBe(true);
      expect(reread.defaultPlugin).toBe('spec');
      expect(reread.taskRunner!.runner).toBe('make');
    });
  });
});
