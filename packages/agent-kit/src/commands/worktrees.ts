import { Command } from 'commander';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { readWorktrees, writeWorktrees, readPlans, writePlans } from '../config.js';
import { findProjectRoot, isInWorktree, getRepoName, getCurrentPlan, getWorktreeBasePath } from '../project.js';
import type { WorktreeEntry } from '../types.js';

export function worktreesCommand(): Command {
  const wt = new Command('worktrees').description('Manage git worktrees');

  wt.command('create')
    .description('Create a new worktree')
    .requiredOption('--branch <branch>', 'Branch name')
    .option('--base <base>', 'Base branch/commit', 'HEAD')
    .option('--plan <plan>', 'Associated plan name')
    .option('--base-path <basePath>', 'Custom base path for worktrees')
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const projectRoot = requireProjectRoot();

      if (!/^[\w/.-]+$/.test(opts.branch)) {
        console.error('Invalid branch name: only alphanumeric, hyphens, underscores, slashes, and dots allowed');
        process.exit(1);
      }

      const existing = parseWorktreeList(projectRoot);
      if (existing.some((e) => e.branch === opts.branch)) {
        console.error(`Branch "${opts.branch}" is already a worktree`);
        process.exit(1);
      }

      const repoName = getRepoName(projectRoot);
      const basePath = opts.basePath ?? getWorktreeBasePath(repoName, projectRoot);
      const wtName = opts.plan ?? opts.branch;
      const wtPath = path.join(basePath, wtName);

      if (fs.existsSync(wtPath)) {
        console.error(`Directory already exists: ${wtPath}`);
        process.exit(1);
      }

      fs.mkdirSync(basePath, { recursive: true });

      const branchCheck = spawnSync('git', ['rev-parse', '--verify', opts.branch], {
        encoding: 'utf-8',
        cwd: projectRoot,
      });
      if (branchCheck.status === 0) {
        gitExec(['worktree', 'add', wtPath, opts.branch], projectRoot);
      } else {
        gitExec(['worktree', 'add', '-b', opts.branch, wtPath, opts.base], projectRoot);
      }

      const wtDir = opts.registry ? path.dirname(opts.registry) : path.join(projectRoot, '.codevoyant');
      const worktreesData = readWorktrees(wtDir);
      const entry: WorktreeEntry = {
        branch: opts.branch,
        path: wtPath,
        planName: opts.plan ?? null,
        createdAt: new Date().toISOString(),
      };
      worktreesData.entries.push(entry);
      writeWorktrees(worktreesData, wtDir);

      console.log(`Worktree created: ${wtPath}`);
    });

  wt.command('remove')
    .description('Remove a worktree')
    .requiredOption('--branch <branch>', 'Branch name')
    .option('--delete-branch', 'Also delete the branch', false)
    .option('--force', 'Force removal', false)
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const projectRoot = requireProjectRoot();
      const worktrees = parseWorktreeList(projectRoot);
      const wte = worktrees.find((e) => e.branch === opts.branch);
      if (!wte) {
        console.error(`Worktree for branch "${opts.branch}" not found`);
        process.exit(1);
      }

      const statusResult = spawnSync('git', ['-C', wte.worktree, 'status', '--porcelain'], { encoding: 'utf-8' });
      if (statusResult.stdout && statusResult.stdout.trim() && !opts.force) {
        console.error(`Worktree has uncommitted changes. Use --force to remove anyway.`);
        process.exit(1);
      }

      const removeArgs = ['worktree', 'remove', wte.worktree];
      if (opts.force) removeArgs.push('--force');
      gitExec(removeArgs, projectRoot);

      if (opts.deleteBranch) {
        const deleteFlag = opts.force ? '-D' : '-d';
        gitExec(['branch', deleteFlag, opts.branch], projectRoot);
      }

      const wtDir = opts.registry ? path.dirname(opts.registry) : path.join(projectRoot, '.codevoyant');
      const worktreesData = readWorktrees(wtDir);
      worktreesData.entries = worktreesData.entries.filter((w) => w.branch !== opts.branch);
      writeWorktrees(worktreesData, wtDir);

      console.log(`Removed worktree: ${opts.branch}`);
    });

  wt.command('prune')
    .description('Prune stale worktrees')
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const projectRoot = findProjectRoot() ?? '.';
      gitExec(['worktree', 'prune', '--verbose'], projectRoot);

      const wtDir = opts.registry ? path.dirname(opts.registry) : path.join(projectRoot, '.codevoyant');
      const worktreesData = readWorktrees(wtDir);
      const before = worktreesData.entries.length;
      worktreesData.entries = worktreesData.entries.filter((w) => fs.existsSync(w.path));
      const pruned = before - worktreesData.entries.length;
      writeWorktrees(worktreesData, wtDir);

      console.log(`Pruned ${pruned} stale worktree entries`);
    });

  wt.command('list')
    .description('List worktrees')
    .option('--json', 'Output as JSON', false)
    .option('--filter <plan>', 'Filter by plan name')
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const projectRoot = findProjectRoot() ?? '.';
      const worktrees = parseWorktreeList(projectRoot);
      const wtDir = opts.registry ? path.dirname(opts.registry) : path.join(projectRoot, '.codevoyant');
      const worktreesData = readWorktrees(wtDir);
      const plansData = readPlans(wtDir);

      let enriched = worktrees.map((wte) => {
        const registered = worktreesData.entries.find((w) => w.branch === wte.branch);
        const plan = plansData.active.find((p) => p.worktree === wte.worktree || p.branch === wte.branch);

        let dirty = false;
        try {
          const status = spawnSync('git', ['-C', wte.worktree, 'status', '--porcelain'], { encoding: 'utf-8' });
          dirty = !!(status.stdout && status.stdout.trim());
        } catch {
          // ignore
        }

        return {
          path: wte.worktree,
          branch: wte.branch,
          commit: wte.HEAD?.slice(0, 8) ?? '',
          status: dirty ? 'dirty' : 'clean',
          plan: plan?.name ?? registered?.planName ?? null,
        };
      });

      if (opts.filter) {
        enriched = enriched.filter((e) => e.plan && e.plan.toLowerCase().includes(opts.filter.toLowerCase()));
      }

      if (opts.json) {
        console.log(JSON.stringify(enriched, null, 2));
      } else {
        console.log('PATH\tBRANCH\tCOMMIT\tSTATUS\tPLAN');
        for (const e of enriched) {
          console.log(`${e.path}\t${e.branch}\t${e.commit}\t${e.status}\t${e.plan ?? ''}`);
        }
      }
    });

  wt.command('export')
    .description('Export plan from worktree to main repo')
    .option('--plan <plan>', 'Plan name to export')
    .option('--force', 'Overwrite existing plan in main repo', false)
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const wtDir = opts.registry ? path.dirname(opts.registry) : '.codevoyant';
      const plansData = readPlans(wtDir);

      let planName = opts.plan;
      if (!planName) {
        const sorted = [...plansData.active].sort(
          (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
        );
        if (sorted.length === 0) {
          console.error('No active plans found');
          process.exit(1);
        }
        planName = sorted[0].name;
        console.log(`Auto-detected plan: ${planName}`);
      }

      const planDir = path.join('.codevoyant', 'plans', planName);
      const planMd = path.join(planDir, 'plan.md');
      if (!fs.existsSync(planMd)) {
        console.error(`Plan file not found: ${planMd}`);
        process.exit(1);
      }

      const gitCommonDir = gitExec(['rev-parse', '--git-common-dir']);
      const mainRoot = path.resolve(path.dirname(gitCommonDir));
      const currentRoot = path.resolve('.');

      if (mainRoot === currentRoot) {
        console.error('Already in main repo');
        process.exit(1);
      }

      const destDir = path.join(mainRoot, '.codevoyant', 'plans', planName);
      if (fs.existsSync(destDir) && !opts.force) {
        console.error(`Destination already exists: ${destDir}. Use --force to overwrite.`);
        process.exit(1);
      }

      fs.cpSync(planDir, destDir, { recursive: true, force: true });

      const mainCvDir = path.join(mainRoot, '.codevoyant');
      const mainPlans = readPlans(mainCvDir);
      const existingPlan = mainPlans.active.find((p) => p.name === planName);
      const sourcePlan = plansData.active.find((p) => p.name === planName);

      if (existingPlan && sourcePlan) {
        existingPlan.progress = sourcePlan.progress;
        existingPlan.status = sourcePlan.status;
        existingPlan.lastUpdated = new Date().toISOString();
      } else if (sourcePlan) {
        mainPlans.active.push({ ...sourcePlan, lastUpdated: new Date().toISOString() });
      }

      writePlans(mainPlans, mainCvDir);
      console.log(`Exported ${planName} to ${destDir}`);
    });

  wt.command('register')
    .description('Register a worktree in the registry (no git operations)')
    .requiredOption('--branch <branch>', 'Branch name')
    .requiredOption('--path <path>', 'Worktree path')
    .option('--plan <plan>', 'Associated plan name')
    .option('--registry <registryPath>', 'Path to worktrees.json')
    .action((opts) => {
      const wtDir = opts.registryPath ? path.dirname(opts.registryPath) : '.codevoyant';
      const worktreesData = readWorktrees(wtDir);

      const entry: WorktreeEntry = {
        branch: opts.branch,
        path: opts.path,
        planName: opts.plan ?? null,
        createdAt: new Date().toISOString(),
      };
      worktreesData.entries.push(entry);
      writeWorktrees(worktreesData, wtDir);
      console.log(`Registered worktree: ${opts.branch}`);
    });

  wt.command('unregister')
    .description('Unregister a worktree from the registry (no git operations)')
    .requiredOption('--branch <branch>', 'Branch name')
    .option('--registry <path>', 'Path to worktrees.json')
    .action((opts) => {
      const wtDir = opts.registry ? path.dirname(opts.registry) : '.codevoyant';
      const worktreesData = readWorktrees(wtDir);
      const before = worktreesData.entries.length;
      worktreesData.entries = worktreesData.entries.filter((w) => w.branch !== opts.branch);

      if (worktreesData.entries.length === before) {
        console.error(`Worktree for branch "${opts.branch}" not found in registry`);
        process.exit(1);
      }

      writeWorktrees(worktreesData, wtDir);
      console.log(`Unregistered worktree: ${opts.branch}`);
    });

  wt.command('attach')
    .description('Register a manually-created worktree')
    .requiredOption('--path <path>', 'Path to existing worktree')
    .requiredOption('--plan <plan>', 'Associated plan name')
    .option('--registry <registryPath>', 'Path to worktrees.json')
    .action((opts) => {
      const wtPath = path.resolve(opts.path);

      if (!fs.existsSync(wtPath)) {
        console.error(`Path does not exist: ${wtPath}`);
        process.exit(1);
      }

      const gitPath = path.join(wtPath, '.git');
      if (!fs.existsSync(gitPath)) {
        console.error(`Not a git worktree: ${wtPath} (no .git found)`);
        process.exit(1);
      }

      let branch: string;
      try {
        branch = gitExec(['rev-parse', '--abbrev-ref', 'HEAD'], wtPath);
      } catch {
        console.error(`Cannot determine branch for worktree at: ${wtPath}`);
        process.exit(1);
        return;
      }

      const wtDir = opts.registryPath ? path.dirname(opts.registryPath) : '.codevoyant';
      const worktreesData = readWorktrees(wtDir);

      if (worktreesData.entries.some((w) => w.path === wtPath)) {
        console.error(`Worktree already registered: ${wtPath}`);
        process.exit(1);
      }

      const entry: WorktreeEntry = {
        branch,
        path: wtPath,
        planName: opts.plan,
        createdAt: new Date().toISOString(),
      };
      worktreesData.entries.push(entry);
      writeWorktrees(worktreesData, wtDir);

      console.log(`Attached worktree: ${wtPath} (branch: ${branch}, plan: ${opts.plan})`);
    });

  wt.command('detect')
    .description('Print current worktree context (repo, plan, branch)')
    .action(() => {
      const projectRoot = findProjectRoot();
      const inWorktree = isInWorktree();
      const repoName = getRepoName();
      const plan = getCurrentPlan();

      let branch = '';
      try {
        branch = gitExec(['rev-parse', '--abbrev-ref', 'HEAD']);
      } catch {
        // not in a git repo
      }

      const info = {
        projectRoot: projectRoot ?? null,
        repoName,
        branch: branch || null,
        isWorktree: inWorktree,
        plan: plan ?? null,
      };

      console.log(JSON.stringify(info, null, 2));
    });

  return wt;
}

// HELPERS -----------------------------------------------------------------------------------------

interface ParsedWorktree {
  worktree: string;
  branch: string;
  HEAD: string;
  bare?: boolean;
}

/** Run a git command, throw on failure. */
function gitExec(args: string[], cwd?: string): string {
  const result = spawnSync('git', args, { encoding: 'utf-8', cwd });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `git ${args[0]} failed`);
  return result.stdout?.trim() ?? '';
}

/** Parse `git worktree list --porcelain` output into structured entries. */
function parseWorktreeList(cwd?: string): ParsedWorktree[] {
  const output = gitExec(['worktree', 'list', '--porcelain'], cwd);
  if (!output) return [];

  const entries: ParsedWorktree[] = [];
  let current: Partial<ParsedWorktree> = {};

  for (const line of output.split('\n')) {
    if (line === '') {
      if (current.worktree) entries.push(current as ParsedWorktree);
      current = {};
    } else if (line.startsWith('worktree ')) {
      current.worktree = line.slice('worktree '.length);
    } else if (line.startsWith('HEAD ')) {
      current.HEAD = line.slice('HEAD '.length);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace('refs/heads/', '');
    } else if (line === 'bare') {
      current.bare = true;
    }
  }
  if (current.worktree) entries.push(current as ParsedWorktree);

  return entries;
}

/** Resolve the project root. Exits with code 1 if not in a git repo. */
function requireProjectRoot(): string {
  const root = findProjectRoot();
  if (!root) {
    console.error('Not in a git repository');
    process.exit(1);
  }
  return root;
}
