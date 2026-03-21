import { Command } from 'commander';
import { readSettings } from '../config.js';

function traverseDotPath(obj: unknown, dotpath: string): unknown {
  const keys = dotpath.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function settingsCommand(): Command {
  const settings = new Command('settings').description('Read project settings from .codevoyant/settings.json');

  settings
    .command('get <dotpath>')
    .description('Get a value from settings.json using dot-notation (e.g., docs)')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((dotpath: string, opts: { dir: string }) => {
      const settingsDir = `${opts.dir}/.codevoyant`;
      const data = readSettings(settingsDir);
      const value = traverseDotPath(data, dotpath);

      if (value === undefined) {
        process.exitCode = 1;
        return;
      }

      if (typeof value === 'object') {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(JSON.stringify(value));
      }
    });

  return settings;
}
