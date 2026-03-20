#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { plansCommand } from './commands/plans.js';
import { notifyCommand } from './commands/notify.js';
import { worktreesCommand } from './commands/worktrees.js';
import { gitCommand } from './commands/git.js';
import { taskRunnerCommand } from './commands/task-runner.js';
const program = new Command();
program
    .name('codevoyant')
    .description('CLI for managing codevoyant plans, worktrees, and config')
    .version(process.env.npm_package_version ?? '0.0.0');
program.addCommand(initCommand());
program.addCommand(plansCommand());
program.addCommand(notifyCommand());
program.addCommand(worktreesCommand());
program.addCommand(gitCommand());
program.addCommand(taskRunnerCommand());
program.parse();
//# sourceMappingURL=bin.js.map