import { Command } from 'commander';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { readSettings, writeSettings } from '../config.js';
import type { TaskRunnerInfo } from '../types.js';

interface RunnerDefinition {
  runner: string;
  command: string;
  configFiles: string[];
  /** Return true if the config file qualifies (e.g. package.json must have scripts). */
  qualify?: (filePath: string) => boolean;
}

const RUNNER_PRIORITY: RunnerDefinition[] = [
  { runner: 'just', command: 'just', configFiles: ['justfile', 'Justfile'] },
  { runner: 'task', command: 'task', configFiles: ['Taskfile.yml', 'Taskfile.yaml'] },
  { runner: 'mise', command: 'mise run', configFiles: ['mise.toml', '.mise.toml'] },
  { runner: 'make', command: 'make', configFiles: ['makefile', 'Makefile'] },
  {
    runner: 'npm',
    command: 'npm run',
    configFiles: ['package.json'],
    qualify: (filePath: string) => {
      try {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return !!(pkg.scripts && Object.keys(pkg.scripts).length > 0);
      } catch {
        return false;
      }
    },
  },
];

/**
 * Detect the task runner by scanning for config files in priority order.
 * Optionally provide a cwd to search from (defaults to process.cwd()).
 */
export function detectRunner(cwd?: string): TaskRunnerInfo | null {
  const dir = cwd ?? process.cwd();

  for (const def of RUNNER_PRIORITY) {
    for (const configFile of def.configFiles) {
      const filePath = path.join(dir, configFile);
      if (fs.existsSync(filePath)) {
        if (def.qualify && !def.qualify(filePath)) continue;

        // Prefer pnpm over npm if lockfile exists
        let command = def.command;
        if (def.runner === 'npm') {
          if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
            command = 'pnpm run';
          } else if (fs.existsSync(path.join(dir, 'yarn.lock'))) {
            command = 'yarn run';
          }
        }

        return {
          runner: command.split(' ')[0],
          command,
          configFile,
          detectedAt: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

interface TaskEntry {
  name: string;
  description?: string;
}

/**
 * List available tasks for a given runner by invoking its list command.
 * If the runner binary is not installed, falls back to showing raw config file content.
 */
export function listTasks(info: TaskRunnerInfo, cwd?: string): TaskEntry[] {
  const dir = cwd ?? process.cwd();

  try {
    switch (info.runner) {
      case 'just': {
        const output = execSync('just --dump --dump-format json', { encoding: 'utf-8', cwd: dir });
        const dump = JSON.parse(output);
        const recipes = dump.recipes ?? {};
        return Object.entries(recipes).map(([name, recipe]) => ({
          name,
          description: (recipe as { doc?: string }).doc ?? undefined,
        }));
      }
      case 'mise': {
        const output = execSync('mise tasks ls --json', { encoding: 'utf-8', cwd: dir });
        const tasks = JSON.parse(output) as Array<{ name: string; description?: string }>;
        return tasks.map((t) => ({ name: t.name, description: t.description }));
      }
      case 'task': {
        const output = execSync('task --list-all --json', { encoding: 'utf-8', cwd: dir });
        const data = JSON.parse(output);
        const tasks = data.tasks ?? [];
        return (tasks as Array<{ name: string; desc?: string }>).map((t) => ({
          name: t.name,
          description: t.desc ?? undefined,
        }));
      }
      case 'make': {
        const output = execSync(
          `make -pRrq 2>/dev/null | awk -F: '/^[a-zA-Z0-9][^$#\\/\\t=]*:([^=]|$)/ {split($1,a," ");print a[1]}' | sort -u`,
          { encoding: 'utf-8', cwd: dir, shell: '/bin/sh' },
        );
        return output
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((name) => ({ name }));
      }
      case 'pnpm':
      case 'npm':
      case 'yarn': {
        const pkgPath = path.join(dir, 'package.json');
        if (!fs.existsSync(pkgPath)) return [];
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const scripts = pkg.scripts ?? {};
        return Object.entries(scripts).map(([name, cmd]) => ({
          name,
          description: typeof cmd === 'string' ? cmd : undefined,
        }));
      }
      default:
        return [];
    }
  } catch (err) {
    // If the runner binary is not installed (ENOENT or "not found" in stderr),
    // fall back to showing raw config file content as a single entry.
    if (isBinaryMissing(err)) {
      return readConfigFileFallback(info.configFile, dir);
    }
    return [];
  }
}

// HELPERS -----------------------------------------------------------------------------------------

/** Returns true if the error indicates the runner binary is not installed. */
function isBinaryMissing(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      (err as NodeJS.ErrnoException).code === 'ENOENT' ||
      msg.includes('command not found') ||
      msg.includes('not found') ||
      msg.includes('no such file')
    );
  }
  return false;
}

/** Read the config file and return its content as a single fallback entry. */
function readConfigFileFallback(configFile: string, dir: string): TaskEntry[] {
  const filePath = path.join(dir, configFile);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return [{ name: '(raw)', description: content }];
  } catch {
    return [];
  }
}

export function taskRunnerCommand(): Command {
  const cmd = new Command('task-runner').description('Detect and interact with project task runners');

  cmd
    .command('detect')
    .description('Detect the active task runner and cache the result')
    .option('--dir <dir>', 'Directory to scan', '.')
    .option('--settings-dir <settingsDir>', 'Directory for settings.json', '.codevoyant')
    .action((opts) => {
      const info = detectRunner(opts.dir === '.' ? undefined : opts.dir);

      if (!info) {
        console.error('No task runner detected');
        process.exit(1);
      }

      // Cache in settings.json
      const settings = readSettings(opts.settingsDir);
      settings.taskRunner = info;
      writeSettings(settings, opts.settingsDir);

      console.log(JSON.stringify({ ...info, cached: true }, null, 2));
    });

  cmd
    .command('list')
    .description('List available tasks for the detected runner')
    .option('--json', 'Output as JSON', false)
    .option('--dir <dir>', 'Directory to scan', '.')
    .option('--settings-dir <settingsDir>', 'Directory for settings.json', '.codevoyant')
    .action((opts) => {
      // Try to read cached runner, otherwise detect
      const settings = readSettings(opts.settingsDir);
      let info = settings.taskRunner ?? null;

      if (!info) {
        info = detectRunner(opts.dir === '.' ? undefined : opts.dir);
        if (!info) {
          console.error('No task runner detected');
          process.exit(1);
        }
      }

      const tasks = listTasks(info, opts.dir === '.' ? undefined : opts.dir);

      if (opts.json) {
        console.log(JSON.stringify({ runner: info.runner, command: info.command, tasks }, null, 2));
      } else {
        console.log(`Runner: ${info.command}`);
        console.log('');
        for (const t of tasks) {
          const desc = t.description ? `  # ${t.description}` : '';
          console.log(`  ${t.name}${desc}`);
        }
      }
    });

  cmd
    .command('run')
    .description('Run a task using the detected runner')
    .argument('<task>', 'Task name to run')
    .argument('[args...]', 'Additional arguments')
    .option('--dir <dir>', 'Directory to run in', '.')
    .option('--settings-dir <settingsDir>', 'Directory for settings.json', '.codevoyant')
    .action((task, args, opts) => {
      const settings = readSettings(opts.settingsDir);
      let info = settings.taskRunner ?? null;

      if (!info) {
        info = detectRunner(opts.dir === '.' ? undefined : opts.dir);
        if (!info) {
          console.error('No task runner detected');
          process.exit(1);
        }
      }

      const extraArgs = args.length > 0 ? ' ' + args.join(' ') : '';
      const fullCommand = `${info.command} ${task}${extraArgs}`;
      const cwd = opts.dir === '.' ? undefined : opts.dir;

      try {
        execSync(fullCommand, { stdio: 'inherit', cwd, shell: '/bin/sh' });
      } catch {
        process.exit(1);
      }
    });

  return cmd;
}
