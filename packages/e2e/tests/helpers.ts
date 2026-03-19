import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// helpers.ts lives at packages/e2e/tests/ — go up 4 to reach repo root
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Create an isolated temp home dir for each test. */
export function createTmpHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'codevoyant-e2e-'));
  // Proper git repo so install-vscode.sh agent step detects a workspace
  const workspaceDir = join(dir, 'workspace');
  mkdirSync(workspaceDir, { recursive: true });
  spawnSync('git', ['init', '-b', 'main', workspaceDir], { stdio: 'ignore' });
  return dir;
}

export function cleanupTmpHome(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Run a script with an isolated HOME/XDG_CONFIG_HOME. Returns the result. */
export function runScript(
  script: string,
  args: string[],
  tmpHome: string,
  extraEnv: Record<string, string> = {},
): ReturnType<typeof spawnSync> {
  return spawnSync('bash', [join(REPO_ROOT, 'scripts', script), ...args], {
    env: {
      ...process.env,
      HOME: tmpHome,
      XDG_CONFIG_HOME: join(tmpHome, '.config'),
      CLAUDEVOYANT_REPO: REPO_ROOT,
      // Strip color codes so output is readable in test failures
      NO_COLOR: '1',
      TERM: 'dumb',
      ...extraEnv,
    },
    cwd: join(tmpHome, 'workspace'),
    encoding: 'utf-8',
  });
}

/** Parse YAML frontmatter from a SKILL.md string. Returns key→value map. */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    result[key] = value;
  }
  return result;
}
