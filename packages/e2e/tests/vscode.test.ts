import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createTmpHome, cleanupTmpHome, runScript, parseFrontmatter, REPO_ROOT } from './helpers.js';

const VSCODE_PLUGINS = ['spec', 'dev', 'style', 'adr'] as const;

function skillsDir(tmpHome: string): string {
  return join(tmpHome, '.copilot/skills');
}

function agentsDir(tmpHome: string): string {
  return join(tmpHome, 'workspace/.github/agents');
}

function installedSkillsFor(tmpHome: string, prefix: string): string[] {
  const dir = skillsDir(tmpHome);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(`${prefix}-`))
    .map((d) => d.name);
}

describe('VS Code Copilot installation', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = createTmpHome();
    // Start clean: uninstall naturally
    runScript('install-vscode.sh', ['--uninstall'], tmpHome);
  });

  afterEach(() => {
    cleanupTmpHome(tmpHome);
  });

  it('uninstall on a clean dir exits 0', () => {
    const result = runScript('install-vscode.sh', ['--uninstall'], tmpHome);
    expect(result.status).toBe(0);
  });

  it('installs all plugins and exits 0', () => {
    const result = runScript('install-vscode.sh', [], tmpHome);
    expect(result.status, result.stderr).toBe(0);
  });

  it('creates skills dir at $HOME/.copilot/skills', () => {
    runScript('install-vscode.sh', [], tmpHome);
    expect(existsSync(skillsDir(tmpHome))).toBe(true);
  });

  it('installs skills for all expected plugins', () => {
    runScript('install-vscode.sh', [], tmpHome);
    for (const prefix of VSCODE_PLUGINS) {
      const installed = installedSkillsFor(tmpHome, prefix);
      expect(installed.length, `no ${prefix}-* skills found`).toBeGreaterThan(0);
    }
  });

  it('installed skill dirs match source skill dirs', () => {
    runScript('install-vscode.sh', [], tmpHome);
    for (const prefix of VSCODE_PLUGINS) {
      const sourceSkills = readdirSync(join(REPO_ROOT, `plugins/${prefix}/skills`), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => `${prefix}-${d.name}`);
      for (const expected of sourceSkills) {
        expect(installedSkillsFor(tmpHome, prefix), `${expected} not installed`).toContain(expected);
      }
    }
  });

  it('each installed SKILL.md has name: field matching its directory', () => {
    runScript('install-vscode.sh', [], tmpHome);
    const dir = skillsDir(tmpHome);
    for (const skillDir of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const skillFile = join(dir, skillDir.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
      expect(fm.name, `${skillDir.name}/SKILL.md missing name: field`).toBe(skillDir.name);
    }
  });

  it('each installed SKILL.md has a description', () => {
    runScript('install-vscode.sh', [], tmpHome);
    const dir = skillsDir(tmpHome);
    for (const skillDir of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const skillFile = join(dir, skillDir.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const fm = parseFrontmatter(readFileSync(skillFile, 'utf-8'));
      expect(fm.description, `${skillDir.name}/SKILL.md missing description`).toBeTruthy();
    }
  });

  it('installs agents to workspace .github/agents/', () => {
    runScript('install-vscode.sh', [], tmpHome);
    const dir = agentsDir(tmpHome);
    expect(existsSync(dir)).toBe(true);
    const agents = readdirSync(dir).filter((f) => f.endsWith('.agent.md'));
    expect(agents.length, 'no .agent.md files installed').toBeGreaterThan(0);
  });

  it('agent files use .agent.md suffix', () => {
    runScript('install-vscode.sh', [], tmpHome);
    const dir = agentsDir(tmpHome);
    if (!existsSync(dir)) return;
    const nonAgentMd = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.endsWith('.agent.md'));
    expect(nonAgentMd, `unexpected non-.agent.md files: ${nonAgentMd.join(', ')}`).toHaveLength(0);
  });

  it('filter: installing only spec skips dev skills', () => {
    runScript('install-vscode.sh', ['spec'], tmpHome);
    expect(installedSkillsFor(tmpHome, 'dev').length).toBe(0);
    expect(installedSkillsFor(tmpHome, 'spec').length).toBeGreaterThan(0);
  });

  it('re-install is idempotent', () => {
    runScript('install-vscode.sh', [], tmpHome);
    const first = installedSkillsFor(tmpHome, 'spec');
    const result = runScript('install-vscode.sh', [], tmpHome);
    expect(result.status, result.stderr).toBe(0);
    expect(installedSkillsFor(tmpHome, 'spec')).toEqual(first);
  });

  it('uninstall removes all installed skills', () => {
    runScript('install-vscode.sh', [], tmpHome);
    expect(installedSkillsFor(tmpHome, 'spec').length).toBeGreaterThan(0);

    const result = runScript('install-vscode.sh', ['--uninstall'], tmpHome);
    expect(result.status, result.stderr).toBe(0);

    for (const prefix of VSCODE_PLUGINS) {
      expect(installedSkillsFor(tmpHome, prefix).length, `${prefix} skills not removed`).toBe(0);
    }
  });
});
