import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { readSettings, writePlans, writeWorktrees } from '../config.js';

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize .codevoyant/ directory structure')
    .option('--dir <dir>', 'target directory', '.')
    .action((opts) => {
      const base = path.join(opts.dir, '.codevoyant');
      const plansPath = path.join(base, 'plans.json');
      const worktreesPath = path.join(base, 'worktrees.json');
      const legacyConfigPath = path.join(base, 'codevoyant.json');

      // Create plans dir
      fs.mkdirSync(path.join(base, 'plans'), { recursive: true });

      // Auto-migrate from codevoyant.json if plans.json doesn't exist yet
      if (fs.existsSync(legacyConfigPath) && !fs.existsSync(plansPath)) {
        console.log('Migrating codevoyant.json to plans.json + worktrees.json');
        const raw = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf-8'));
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
        console.log('Migrated to plans.json and worktrees.json (codevoyant.json preserved)');
      }

      // Initialize plans.json if absent
      if (!fs.existsSync(plansPath)) {
        writePlans({ version: '1.0', active: [], archived: [] }, base);
        console.log('Created .codevoyant/plans.json');
      }

      // Initialize worktrees.json if absent
      if (!fs.existsSync(worktreesPath)) {
        writeWorktrees({ version: '1.0', entries: [] }, base);
        console.log('Created .codevoyant/worktrees.json');
      }

      readSettings(base);

      // Ensure .gitignore entries
      const gitignorePath = path.join(opts.dir, '.gitignore');
      const entries = ['.codevoyant/worktrees/'];
      if (fs.existsSync(gitignorePath)) {
        const existing = fs.readFileSync(gitignorePath, 'utf-8');
        const missing = entries.filter((e) => !existing.includes(e));
        if (missing.length > 0) {
          fs.appendFileSync(gitignorePath, '\n# codevoyant\n' + missing.join('\n') + '\n');
          console.log(`Added to .gitignore: ${missing.join(', ')}`);
        }
      } else {
        fs.writeFileSync(gitignorePath, '# codevoyant\n' + entries.join('\n') + '\n');
        console.log('Created .gitignore with codevoyant entries');
      }

      console.log('.codevoyant/ ready');
    });
}
