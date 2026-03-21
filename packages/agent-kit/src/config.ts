import * as fs from 'fs';
import * as path from 'path';
import type { CodevoyantConfig, CodevoyantSettings, PlansFile, WorktreesFile } from './types.js';

const DEFAULT_CONFIG: CodevoyantConfig = {
  version: '1.0',
  activePlans: [],
  archivedPlans: [],
  worktrees: [],
};

const DEFAULT_PLANS: PlansFile = { version: '1.0', active: [], archived: [] };
const DEFAULT_WORKTREES: WorktreesFile = { version: '1.0', entries: [] };

/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export function getConfigPath(registry?: string): string {
  return registry ?? path.join('.codevoyant', 'codevoyant.json');
}

/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export function readConfig(configPath: string): CodevoyantConfig {
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as CodevoyantConfig;
}

/**
 * @deprecated Use readPlans/writePlans and readWorktrees/writeWorktrees instead.
 * Kept for migration purposes only.
 */
export function writeConfig(configPath: string, config: CodevoyantConfig): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = `${configPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n');
  fs.renameSync(tmp, configPath);
}

export function readSettings(dir = '.codevoyant'): CodevoyantSettings {
  const p = path.join(dir, 'settings.json');
  if (!fs.existsSync(p)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, '{}\n');
    return {};
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as CodevoyantSettings;
}

export function writeSettings(settings: CodevoyantSettings, dir = '.codevoyant'): void {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'settings.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

export function readPlans(dir = '.codevoyant'): PlansFile {
  const p = path.join(dir, 'plans.json');
  if (!fs.existsSync(p)) return { ...DEFAULT_PLANS };
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as PlansFile;
}

export function writePlans(plans: PlansFile, dir = '.codevoyant'): void {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'plans.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(plans, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

export function readWorktrees(dir = '.codevoyant'): WorktreesFile {
  const p = path.join(dir, 'worktrees.json');
  if (!fs.existsSync(p)) return { ...DEFAULT_WORKTREES };
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as WorktreesFile;
}

export function writeWorktrees(worktrees: WorktreesFile, dir = '.codevoyant'): void {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'worktrees.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(worktrees, null, 2) + '\n');
  fs.renameSync(tmp, p);
}
