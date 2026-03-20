import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { REPO_ROOT } from './helpers.js';

const FIXTURE_DIR = join(REPO_ROOT, 'e2e/fixtures/demo-project');
const CLI = join(REPO_ROOT, 'packages/agent-kit/dist/bin.js');

function mkTmp(): string {
  const dir = spawnSync('mktemp', ['-d'], { encoding: 'utf-8' }).stdout.trim();
  return dir;
}

function spawnCLI(args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const r = spawnSync('node', [CLI, ...args], { encoding: 'utf-8', cwd });
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('mem -- npx-only (no plugin)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkTmp();
    cpSync(FIXTURE_DIR, tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('mem index creates mem.json with all fixture docs', () => {
    const result = spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Indexed 3 doc(s)');

    const manifestPath = join(tmpDir, '.codevoyant', 'mem.json');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest).toHaveLength(3);

    const paths = manifest.map((e: { path: string }) => e.path).sort();
    expect(paths).toContain('recipes/deploy.md');
    expect(paths).toContain('styleguide/package-manager.md');
    expect(paths).toContain('styleguide/testing.md');
  });

  it('mem find --type styleguide returns only styleguide docs', () => {
    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'find', '--type', 'styleguide', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split('\n').sort();
    expect(lines).toHaveLength(2);
    expect(lines).toContain('styleguide/package-manager.md');
    expect(lines).toContain('styleguide/testing.md');
  });

  it('mem find --tag pnpm returns package-manager doc', () => {
    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'find', '--tag', 'pnpm', '--json', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    const entries = JSON.parse(result.stdout);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('styleguide/package-manager.md');
    expect(entries[0].description).toBe('Always use pnpm not npm');
  });

  it('mem remember prints terse table without plugin', () => {
    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'remember', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Team Knowledge');
    // All 3 entries present
    expect(result.stdout).toContain('styleguide/package-manager.md');
    expect(result.stdout).toContain('styleguide/testing.md');
    expect(result.stdout).toContain('recipes/deploy.md');
    // Tags and descriptions present
    expect(result.stdout).toContain('[pnpm, packages]');
    expect(result.stdout).toContain('Always use pnpm not npm');
    // No JSON noise
    expect(result.stdout).not.toContain('"path"');
  });

  it('mem remember auto-indexes when mem.json missing', () => {
    // No explicit mem index call
    const result = spawnCLI(['mem', 'remember', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Team Knowledge');
    expect(result.stdout).toContain('styleguide/package-manager.md');
  });
});

describe('mem -- with plugin installed (structure)', () => {
  const memPluginDir = join(REPO_ROOT, 'plugins', 'memory');

  it('memory plugin.json exists with correct name', () => {
    const pluginJsonPath = join(memPluginDir, '.claude-plugin', 'plugin.json');
    expect(existsSync(pluginJsonPath)).toBe(true);
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
    expect(pluginJson.name).toBe('memory');
  });

  it('all expected skills exist', () => {
    const expectedSkills = ['init', 'learn', 'remember', 'index', 'find', 'help'];
    for (const skill of expectedSkills) {
      const skillPath = join(memPluginDir, 'skills', skill, 'SKILL.md');
      expect(existsSync(skillPath), `${skill}/SKILL.md not found`).toBe(true);
    }
  });

  it('mem:init SKILL.md references CLAUDE.md bootstrap', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'init', 'SKILL.md'), 'utf-8');
    expect(content).toContain('CLAUDE.md');
    expect(content).toContain('mem remember');
    expect(content).toContain('AGENTS.md');
    expect(content).toContain('UserPromptSubmit');
  });

  it('mem:init SKILL.md checks for already-configured state', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'init', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Already configured');
  });

  it('mem:learn SKILL.md has both learn and recall modes', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'learn', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Learn Mode');
    expect(content).toContain('Recall Mode');
    expect(content).toContain('mem index');
    expect(content).toContain('mem find');
  });

  it('mem:remember SKILL.md references mem:init tip', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'remember', 'SKILL.md'), 'utf-8');
    expect(content).toContain('mem remember');
    expect(content).toContain('mem:init');
    expect(content).toContain('non-interactive');
  });

  it('mem:help lists all expected commands', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'help', 'SKILL.md'), 'utf-8');
    expect(content).toContain('/mem:init');
    expect(content).toContain('/mem:learn');
    expect(content).toContain('/mem:remember');
    expect(content).toContain('/mem:index');
    expect(content).toContain('/mem:find');
    expect(content).toContain('npx @codevoyant/agent-kit mem');
  });

  it('mem:help has disable-model-invocation: true', () => {
    const content = readFileSync(join(memPluginDir, 'skills', 'help', 'SKILL.md'), 'utf-8');
    expect(content).toContain('disable-model-invocation: true');
  });
});
