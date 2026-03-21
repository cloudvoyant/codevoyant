import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { readPlans, writePlans, readWorktrees, writeWorktrees } from '../config.js';
import type { PlanEntry } from '../types.js';

export function plansCommand(): Command {
  const plans = new Command('plans').description('Manage codevoyant plans');

  plans
    .command('register')
    .description('Register a new plan')
    .requiredOption('--name <name>', 'Plan name')
    .option('--plugin <plugin>', 'Plugin that owns this plan')
    .requiredOption('--description <description>', 'Plan description')
    .option('--total <total>', 'Total tasks', '0')
    .option('--branch <branch>', 'Associated branch')
    .option('--worktree <worktree>', 'Associated worktree path')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);

      const existing = plansData.active.find((p) => p.name === opts.name);
      if (existing) {
        console.error(`Plan "${opts.name}" already exists`);
        process.exit(1);
      }

      const now = new Date().toISOString();
      const entry: PlanEntry = {
        name: opts.name,
        plugin: opts.plugin,
        description: opts.description,
        status: 'Active',
        progress: { completed: 0, total: parseInt(opts.total, 10) },
        created: now,
        lastUpdated: now,
        path: `.codevoyant/plans/${opts.name}/`,
        branch: opts.branch ?? null,
        worktree: opts.worktree ?? null,
      };

      plansData.active.push(entry);
      writePlans(plansData, dir);
      console.log(`Registered plan: ${opts.name}`);
    });

  plans
    .command('update-progress')
    .description('Update plan progress')
    .requiredOption('--name <name>', 'Plan name')
    .requiredOption('--completed <n>', 'Completed tasks')
    .option('--total <n>', 'Total tasks')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      const plan = plansData.active.find((p) => p.name === opts.name);
      if (!plan) {
        console.error(`Plan "${opts.name}" not found`);
        process.exit(1);
      }

      plan.progress.completed = parseInt(opts.completed, 10);
      if (opts.total !== undefined) {
        plan.progress.total = parseInt(opts.total, 10);
      }
      plan.lastUpdated = new Date().toISOString();
      writePlans(plansData, dir);
      console.log(`Updated progress: ${plan.progress.completed}/${plan.progress.total}`);
    });

  plans
    .command('update-status')
    .description('Update plan status')
    .requiredOption('--name <name>', 'Plan name')
    .requiredOption('--status <status>', 'New status')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      const plan = plansData.active.find((p) => p.name === opts.name);
      if (!plan) {
        console.error(`Plan "${opts.name}" not found`);
        process.exit(1);
      }

      plan.status = opts.status;
      plan.lastUpdated = new Date().toISOString();
      writePlans(plansData, dir);
      console.log(`Updated status: ${opts.status}`);
    });

  plans
    .command('archive')
    .description('Archive a plan')
    .requiredOption('--name <name>', 'Plan name')
    .option('--status <status>', 'Final status', 'Complete')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      const idx = plansData.active.findIndex((p) => p.name === opts.name);
      if (idx === -1) {
        console.error(`Plan "${opts.name}" not found in active plans`);
        process.exit(1);
      }

      const [plan] = plansData.active.splice(idx, 1);
      plan.status = opts.status;
      plan.lastUpdated = new Date().toISOString();
      plansData.archived.push(plan);
      writePlans(plansData, dir);
      console.log(`Archived plan: ${opts.name}`);
    });

  plans
    .command('delete')
    .description('Delete a plan')
    .requiredOption('--name <name>', 'Plan name')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);

      let found = false;
      const activeIdx = plansData.active.findIndex((p) => p.name === opts.name);
      if (activeIdx !== -1) {
        plansData.active.splice(activeIdx, 1);
        found = true;
      }
      const archiveIdx = plansData.archived.findIndex((p) => p.name === opts.name);
      if (archiveIdx !== -1) {
        plansData.archived.splice(archiveIdx, 1);
        found = true;
      }

      if (!found) {
        console.error(`Plan "${opts.name}" not found`);
        process.exit(1);
      }

      writePlans(plansData, dir);
      console.log(`Deleted plan: ${opts.name}`);
    });

  plans
    .command('rename')
    .description('Rename a plan')
    .requiredOption('--name <name>', 'Current plan name')
    .requiredOption('--new-name <newName>', 'New plan name')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      const plan = plansData.active.find((p) => p.name === opts.name);
      if (!plan) {
        console.error(`Plan "${opts.name}" not found`);
        process.exit(1);
      }

      plan.name = opts.newName;
      plan.path = `.codevoyant/plans/${opts.newName}/`;
      plan.lastUpdated = new Date().toISOString();
      writePlans(plansData, dir);
      console.log(`Renamed plan: ${opts.name} -> ${opts.newName}`);
    });

  plans
    .command('get')
    .description('Get a single plan as JSON')
    .requiredOption('--name <name>', 'Plan name')
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      const plan =
        plansData.active.find((p) => p.name === opts.name) || plansData.archived.find((p) => p.name === opts.name);
      if (!plan) {
        console.error(`Plan "${opts.name}" not found`);
        process.exit(1);
      }
      console.log(JSON.stringify(plan, null, 2));
    });

  plans
    .command('list')
    .description('List plans as JSON')
    .option('--status <status>', 'Filter by status')
    .option('--plugin <plugin>', 'Filter by plugin')
    .option('--archived', 'Include archived plans', false)
    .option('--dir <dir>', 'Project root directory', '.')
    .action((opts) => {
      const dir = path.join(opts.dir, '.codevoyant');
      const plansData = readPlans(dir);
      let result: PlanEntry[];
      const statusLower = opts.status?.toLowerCase();
      if (statusLower === 'archived') {
        result = [...plansData.archived];
      } else if (statusLower === 'all' || opts.archived) {
        result = [...plansData.active, ...plansData.archived];
      } else {
        result = [...plansData.active];
      }
      if (opts.status && statusLower !== 'archived' && statusLower !== 'all') {
        result = result.filter((p) => p.status.toLowerCase() === statusLower);
      }
      if (opts.plugin) {
        result = result.filter((p) => p.plugin === opts.plugin);
      }
      console.log(JSON.stringify(result, null, 2));
    });

  plans
    .command('migrate')
    .description('Migrate codevoyant.json to plans.json + worktrees.json')
    .option('--dir <dir>', 'Directory containing .codevoyant/', '.')
    .option('--registry <path>', 'Path to codevoyant.json (for migration source)')
    .action((opts) => {
      const base = path.join(opts.dir, '.codevoyant');
      const configPath = opts.registry ?? path.join(base, 'codevoyant.json');
      const plansPath = path.join(base, 'plans.json');

      if (fs.existsSync(plansPath)) {
        console.log('plans.json already exists, skipping migration');
        return;
      }

      if (!fs.existsSync(configPath)) {
        console.error(`No codevoyant.json found at ${configPath}`);
        process.exit(1);
      }

      console.log(`Migrating ${path.basename(configPath)} to plans.json + worktrees.json`);
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      writePlans(
        {
          version: raw.version ?? '1.0',
          active: raw.activePlans ?? [],
          archived: raw.archivedPlans ?? [],
        },
        base,
      );

      writeWorktrees(
        {
          version: raw.version ?? '1.0',
          entries: raw.worktrees ?? [],
        },
        base,
      );

      console.log(`Migrated to plans.json and worktrees.json (codevoyant.json preserved)`);
    });

  return plans;
}
