import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Must be hoisted before importing the module under test
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'child_process';
import { listTasks } from '../../src/commands/task-runner.js';

const mockExecSync = vi.mocked(execSync);

describe('listTasks — binary missing fallback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-taskrunner-fallback-'));
    mockExecSync.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return raw config file when just is not installed (ENOENT)', () => {
    const content = 'default:\n\techo hello\n';
    fs.writeFileSync(path.join(tmpDir, 'justfile'), content);

    mockExecSync.mockImplementation(() => {
      throw Object.assign(new Error('spawn just ENOENT'), { code: 'ENOENT' });
    });

    const info = { runner: 'just', command: 'just', configFile: 'justfile', detectedAt: '' };
    const tasks = listTasks(info, tmpDir);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('(raw)');
    expect(tasks[0].description).toBe(content);
  });

  it('should return raw config file when mise is not installed (ENOENT)', () => {
    const content = '[tasks.test]\nrun = "echo test"\n';
    fs.writeFileSync(path.join(tmpDir, 'mise.toml'), content);

    mockExecSync.mockImplementation(() => {
      throw Object.assign(new Error('spawn mise ENOENT'), { code: 'ENOENT' });
    });

    const info = { runner: 'mise', command: 'mise run', configFile: 'mise.toml', detectedAt: '' };
    const tasks = listTasks(info, tmpDir);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('(raw)');
    expect(tasks[0].description).toContain('[tasks.test]');
  });

  it('should return raw config file when "command not found" in error message', () => {
    const content = 'version: 3\ntasks:\n  default:\n    cmds:\n      - echo hello\n';
    fs.writeFileSync(path.join(tmpDir, 'Taskfile.yml'), content);

    mockExecSync.mockImplementation(() => {
      throw new Error('/bin/sh: task: command not found');
    });

    const info = { runner: 'task', command: 'task', configFile: 'Taskfile.yml', detectedAt: '' };
    const tasks = listTasks(info, tmpDir);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('(raw)');
    expect(tasks[0].description).toContain('version: 3');
  });

  it('should return empty array when binary missing and config file also absent', () => {
    mockExecSync.mockImplementation(() => {
      throw Object.assign(new Error('spawn just ENOENT'), { code: 'ENOENT' });
    });

    const info = { runner: 'just', command: 'just', configFile: 'nonexistent.justfile', detectedAt: '' };
    const tasks = listTasks(info, tmpDir);
    expect(tasks).toEqual([]);
  });

  it('should return empty array for non-ENOENT errors (runner present but failed)', () => {
    fs.writeFileSync(path.join(tmpDir, 'justfile'), 'default:\n\techo hello\n');

    mockExecSync.mockImplementation(() => {
      throw new Error('justfile syntax error on line 2');
    });

    const info = { runner: 'just', command: 'just', configFile: 'justfile', detectedAt: '' };
    const tasks = listTasks(info, tmpDir);
    expect(tasks).toEqual([]);
  });
});
