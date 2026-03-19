import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createTmpHome, cleanupTmpHome, parseFrontmatter, REPO_ROOT } from './helpers.js';

const hasClaude = spawnSync('which', ['claude'], { encoding: 'utf-8' }).status === 0;

function findInstalledPlugin(home: string, plugin: string): string | null {
  const cacheDir = join(home, '.claude', 'plugins', 'cache', 'codevoyant', plugin);
  if (!existsSync(cacheDir)) return null;
  const versions = readdirSync(cacheDir).sort();
  if (!versions.length) return null;
  return join(cacheDir, versions[versions.length - 1]);
}

describe.skipIf(!hasClaude)('Claude CLI plugin installation', () => {
  let tmpHome: string;

  const PLUGINS = ['spec', 'dev', 'adr', 'style', 'em', 'pm'] as const;

  const EXPECTED_COMMANDS: Record<string, string[]> = {
    spec: ['/spec:new', '/spec:go', '/spec:list', '/spec:done', '/spec:worktree'],
    dev: ['/dev:commit', '/dev:ci', '/dev:allow', '/dev:pr-fix', '/dev:rebase'],
    adr: ['/adr:new', '/adr:capture'],
    style: ['/style:init', '/style:add', '/style:review', '/style:doctor'],
    em: ['/em:plan', '/em:breakdown', '/em:review', '/em:update'],
    pm: ['/pm:plan', '/pm:prd', '/pm:breakdown', '/pm:review'],
  };

  beforeAll(() => {
    tmpHome = createTmpHome();

    // Register local repo as marketplace
    const addResult = spawnSync(
      'claude',
      ['plugin', 'marketplace', 'add', REPO_ROOT, '--scope', 'user'],
      { env: { ...process.env, HOME: tmpHome }, encoding: 'utf-8' },
    );
    expect(addResult.status, `marketplace add failed: ${addResult.stderr}`).toBe(0);

    // Install all plugins
    for (const plugin of PLUGINS) {
      const result = spawnSync('claude', ['plugin', 'install', plugin, '--scope', 'user'], {
        env: { ...process.env, HOME: tmpHome },
        encoding: 'utf-8',
      });
      expect(result.status, `install ${plugin} failed: ${result.stderr}`).toBe(0);
    }
  });

  afterAll(() => cleanupTmpHome(tmpHome));

  for (const plugin of PLUGINS) {
    it(`installs ${plugin} plugin to cache`, () => {
      const pluginDir = findInstalledPlugin(tmpHome, plugin);
      expect(pluginDir, `${plugin} not found in cache`).not.toBeNull();
      expect(existsSync(pluginDir!)).toBe(true);
    });

    it(`${plugin} help skill has disable-model-invocation: true`, () => {
      const pluginDir = findInstalledPlugin(tmpHome, plugin);
      const helpSkill = join(pluginDir!, 'skills', 'help', 'SKILL.md');
      expect(existsSync(helpSkill), `${plugin}/help/SKILL.md not found`).toBe(true);
      const fm = parseFrontmatter(readFileSync(helpSkill, 'utf-8'));
      expect(fm['disable-model-invocation'], `${plugin}:help should have disable-model-invocation: true`).toBe('true');
    });

    it(`/${plugin}:help lists all expected commands`, () => {
      const pluginDir = findInstalledPlugin(tmpHome, plugin);
      const helpSkill = join(pluginDir!, 'skills', 'help', 'SKILL.md');
      const content = readFileSync(helpSkill, 'utf-8');
      for (const cmd of EXPECTED_COMMANDS[plugin]) {
        expect(content, `expected ${cmd} in /${plugin}:help`).toContain(cmd);
      }
    });
  }
});
