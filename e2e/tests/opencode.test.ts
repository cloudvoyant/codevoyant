import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createTmpHome, cleanupTmpHome, runScript, parseFrontmatter, REPO_ROOT } from './helpers.js';

// Plugins and expected skill prefixes the opencode install script handles
const OPENCODE_PLUGINS = ['spec', 'dev', 'adr'] as const;

function skillsDir(tmpHome: string): string {
  return join(tmpHome, '.config/opencode/skills');
}

function agentsDir(tmpHome: string): string {
  return join(tmpHome, '.config/opencode/agents');
}

function installedSkillsFor(tmpHome: string, prefix: string): string[] {
  const dir = skillsDir(tmpHome);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(`${prefix}-`))
    .map((d) => d.name);
}

describe('OpenCode installation', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = createTmpHome();
    // Start clean: uninstall naturally (nothing to remove on a fresh tmp dir,
    // but this validates the --uninstall path doesn't error on missing dirs)
    runScript('install-opencode.sh', ['--uninstall'], tmpHome);
  });

  afterEach(() => {
    cleanupTmpHome(tmpHome);
  });

  it('uninstall on a clean dir exits 0', () => {
    const result = runScript('install-opencode.sh', ['--uninstall'], tmpHome);
    expect(result.status).toBe(0);
  });

  it('installs all plugins and exits 0', () => {
    const result = runScript('install-opencode.sh', [], tmpHome);
    expect(result.status, result.stderr).toBe(0);
  });

  it('creates skills dir', () => {
    runScript('install-opencode.sh', [], tmpHome);
    expect(existsSync(skillsDir(tmpHome))).toBe(true);
  });

  it('installs skills for all expected plugins', () => {
    runScript('install-opencode.sh', [], tmpHome);
    for (const prefix of OPENCODE_PLUGINS) {
      const installed = installedSkillsFor(tmpHome, prefix);
      expect(installed.length, `no ${prefix}-* skills found`).toBeGreaterThan(0);
    }
  });

  it('installed skill dirs match source skill dirs', () => {
    runScript('install-opencode.sh', [], tmpHome);
    for (const prefix of OPENCODE_PLUGINS) {
      const sourceSkills = readdirSync(join(REPO_ROOT, `plugins/${prefix}/skills`), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => `${prefix}-${d.name}`);
      const installed = installedSkillsFor(tmpHome, prefix);
      for (const expected of sourceSkills) {
        expect(installed, `${expected} not installed`).toContain(expected);
      }
    }
  });

  it('each installed SKILL.md has name: field in colon format (prefix:skill)', () => {
    runScript('install-opencode.sh', [], tmpHome);
    const dir = skillsDir(tmpHome);
    for (const skillDir of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const skillFile = join(dir, skillDir.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
      // directory is e.g. "dev-commit", name should be "dev:commit"
      const expectedName = skillDir.name.replace('-', ':');
      expect(fm.name, `${skillDir.name}/SKILL.md missing name: field`).toBe(expectedName);
    }
  });

  it('each installed SKILL.md has a description', () => {
    runScript('install-opencode.sh', [], tmpHome);
    const dir = skillsDir(tmpHome);
    for (const skillDir of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const skillFile = join(dir, skillDir.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
      expect(fm.description, `${skillDir.name}/SKILL.md missing description`).toBeTruthy();
    }
  });

  it('strips Claude Code-specific fields (model, disable-model-invocation) from installed SKILL.md', () => {
    runScript('install-opencode.sh', [], tmpHome);
    const dir = skillsDir(tmpHome);
    for (const skillDir of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const skillFile = join(dir, skillDir.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
      expect(fm.model, `${skillDir.name}/SKILL.md should not have model: field`).toBeUndefined();
      expect(
        fm['disable-model-invocation'],
        `${skillDir.name}/SKILL.md should not have disable-model-invocation: field`,
      ).toBeUndefined();
    }
  });

  it('installs spec agents to agents dir', () => {
    runScript('install-opencode.sh', [], tmpHome);
    const dir = agentsDir(tmpHome);
    expect(existsSync(dir)).toBe(true);
    const agents = readdirSync(dir).filter((f) => f.endsWith('.md'));
    expect(agents.length, 'no agents installed').toBeGreaterThan(0);
  });

  it('filter: installing only spec skips dev skills', () => {
    runScript('install-opencode.sh', ['spec'], tmpHome);
    expect(installedSkillsFor(tmpHome, 'dev').length).toBe(0);
    expect(installedSkillsFor(tmpHome, 'spec').length).toBeGreaterThan(0);
  });

  it('re-install is idempotent', () => {
    runScript('install-opencode.sh', [], tmpHome);
    const first = installedSkillsFor(tmpHome, 'spec');
    const result = runScript('install-opencode.sh', [], tmpHome);
    expect(result.status, result.stderr).toBe(0);
    expect(installedSkillsFor(tmpHome, 'spec')).toEqual(first);
  });

  it('uninstall removes all installed skills', () => {
    runScript('install-opencode.sh', [], tmpHome);
    expect(installedSkillsFor(tmpHome, 'spec').length).toBeGreaterThan(0);

    const result = runScript('install-opencode.sh', ['--uninstall'], tmpHome);
    expect(result.status, result.stderr).toBe(0);

    for (const prefix of OPENCODE_PLUGINS) {
      expect(installedSkillsFor(tmpHome, prefix).length, `${prefix} skills not removed`).toBe(0);
    }
  });

  it('opencode CLI discovers installed skills (if opencode is available)', () => {
    const which = spawnSync('which', ['opencode'], { encoding: 'utf-8' });
    if (which.status !== 0) return; // skip if opencode not installed

    runScript('install-opencode.sh', [], tmpHome);

    // opencode reads XDG_CONFIG_HOME for skills
    const result = spawnSync('opencode', ['skills', 'list'], {
      env: {
        ...process.env,
        HOME: tmpHome,
        XDG_CONFIG_HOME: join(tmpHome, '.config'),
      },
      encoding: 'utf-8',
    });

    // If the command exists and runs, at least one spec skill should appear
    if (result.status === 0) {
      expect(result.stdout).toMatch(/spec-/);
    }
  });
});

const hasOpencode = spawnSync('which', ['opencode'], { encoding: 'utf-8' }).status === 0;

describe.skipIf(!hasOpencode)('OpenCode skill invocation', () => {
  let tmpHome: string;

  const EXPECTED_COMMANDS: Record<string, string[]> = {
    spec: ['/spec:new', '/spec:go', '/spec:bg', '/spec:list', '/spec:done'],
    dev: ['/dev:commit', '/dev:ci', '/dev:allow', '/dev:pr-fix', '/dev:rebase'],
    adr: ['/adr:new', '/adr:capture'],
  };

  beforeAll(() => {
    tmpHome = createTmpHome();
    runScript('install-opencode.sh', [], tmpHome);
  });

  afterAll(() => cleanupTmpHome(tmpHome));

  for (const plugin of OPENCODE_PLUGINS) {
    it(`/${plugin}:help outputs expected commands`, () => {
      const result = spawnSync('opencode', ['run', `/${plugin}:help`, '--model', 'opencode/big-pickle'], {
        env: {
          ...process.env,
          HOME: tmpHome,
          XDG_CONFIG_HOME: join(tmpHome, '.config'),
        },
        encoding: 'utf-8',
        timeout: 30000,
      });

      expect(result.status, `opencode run /${plugin}:help failed: ${result.stderr}`).toBe(0);
      for (const cmd of EXPECTED_COMMANDS[plugin]) {
        expect(result.stdout, `expected ${cmd} in /${plugin}:help output`).toContain(cmd);
      }
    });
  }
});
