import * as fs from 'fs';
import * as path from 'path';
import type { CodevoyantConfig, CodevoyantSettings } from './types.js';

const DEFAULT_CONFIG: CodevoyantConfig = {
  version: '1.0',
  activePlans: [],
  archivedPlans: [],
  worktrees: [],
};

export function getConfigPath(registry?: string): string {
  return registry ?? path.join('.codevoyant', 'codevoyant.json');
}

export function readConfig(configPath: string): CodevoyantConfig {
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as CodevoyantConfig;
}

export function writeConfig(configPath: string, config: CodevoyantConfig): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = `${configPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n');
  fs.renameSync(tmp, configPath);
}

export function readSettings(dir = '.codevoyant'): CodevoyantSettings {
  const p = path.join(dir, 'settings.json');
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as CodevoyantSettings;
}

export function writeSettings(settings: CodevoyantSettings, dir = '.codevoyant'): void {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'settings.json');
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(tmp, p);
}
