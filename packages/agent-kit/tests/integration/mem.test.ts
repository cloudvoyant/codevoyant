import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawnCLI, mkTmpDir, cleanTmpDir } from './helpers.js';

function writeMd(dir: string, relativePath: string, frontmatter: string, body = ''): void {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `---\n${frontmatter}\n---\n${body}`);
}

describe('mem command (integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkTmpDir();
    fs.mkdirSync(path.join(tmpDir, '.codevoyant'), { recursive: true });
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('indexes .md files with valid frontmatter', () => {
    writeMd(
      tmpDir,
      'styleguide/naming.md',
      'type: styleguide\ntags: [naming, typescript]\ndescription: Naming conventions',
    );
    writeMd(tmpDir, 'decisions/adr-001.md', 'type: decision\ntags: [architecture]\ndescription: Use ESM');

    const result = spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Indexed 2 doc(s)');

    const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, '.codevoyant', 'mem.json'), 'utf-8'));
    expect(manifest).toHaveLength(2);
  });

  it('omits archived docs from index', () => {
    writeMd(tmpDir, 'active.md', 'type: guide\ntags: [setup]\ndescription: Active');
    writeMd(tmpDir, 'archived.md', 'type: guide\ntags: [setup]\nstatus: archived\ndescription: Archived');

    const result = spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, '.codevoyant', 'mem.json'), 'utf-8'));
    expect(manifest).toHaveLength(1);
    expect(manifest[0].path).toBe('active.md');
  });

  it('treats missing status as active', () => {
    writeMd(tmpDir, 'no-status.md', 'type: guide\ntags: [setup]\ndescription: No status');

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, '.codevoyant', 'mem.json'), 'utf-8'));
    expect(manifest).toHaveLength(1);
    expect(manifest[0].path).toBe('no-status.md');
  });

  it('omits files with no type/tags', () => {
    writeMd(tmpDir, 'valid.md', 'type: guide\ntags: [setup]\ndescription: Valid');
    writeMd(tmpDir, 'no-type.md', 'tags: [orphan]\ndescription: Missing type');
    writeMd(tmpDir, 'no-tags.md', 'type: guide\ndescription: Missing tags');

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, '.codevoyant', 'mem.json'), 'utf-8'));
    expect(manifest).toHaveLength(1);
    expect(manifest[0].path).toBe('valid.md');
  });

  it('mem find --type filters correctly', () => {
    writeMd(tmpDir, 'a.md', 'type: styleguide\ntags: [naming]\ndescription: A');
    writeMd(tmpDir, 'b.md', 'type: decision\ntags: [naming]\ndescription: B');

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'find', '--type', 'styleguide', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('a.md');
  });

  it('mem find --tag uses AND logic across multiple flags', () => {
    writeMd(tmpDir, 'both.md', 'type: guide\ntags: [typescript, naming]\ndescription: Both');
    writeMd(tmpDir, 'one.md', 'type: guide\ntags: [typescript]\ndescription: One');

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'find', '--tag', 'typescript', '--tag', 'naming', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('both.md');
  });

  it('mem find --json returns full entry objects', () => {
    writeMd(tmpDir, 'doc.md', 'type: guide\ntags: [setup]\ndescription: My guide');

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'find', '--tag', 'setup', '--json', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      path: 'doc.md',
      type: 'guide',
      tags: ['setup'],
      description: 'My guide',
    });
  });

  it('learn → index → find round-trip', () => {
    // Simulate mem:learn output: write fixture .md with frontmatter
    writeMd(
      tmpDir,
      'styleguide/pnpm-over-npm.md',
      'type: styleguide\ntags: [pnpm, packages]\ndescription: Always use pnpm not npm\nstatus: active',
      '\nAlways use pnpm instead of npm for package management.\n',
    );

    // Index
    const indexResult = spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);
    expect(indexResult.status).toBe(0);
    expect(indexResult.stdout).toContain('Indexed 1 doc(s)');

    // Find by tag
    const findResult = spawnCLI(
      ['mem', 'find', '--type', 'styleguide', '--tag', 'pnpm', '--json', '--dir', tmpDir],
      tmpDir,
    );
    expect(findResult.status).toBe(0);
    const entries = JSON.parse(findResult.stdout);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('styleguide/pnpm-over-npm.md');
    expect(entries[0].description).toBe('Always use pnpm not npm');
    expect(entries[0].tags).toContain('pnpm');
    expect(entries[0].tags).toContain('packages');
  });

  it('mem remember formats terse table', () => {
    writeMd(
      tmpDir,
      'styleguide/pnpm.md',
      'type: styleguide\ntags: [pnpm, package-manager]\ndescription: Always use pnpm not npm',
    );
    writeMd(
      tmpDir,
      'recipes/deploy.md',
      'type: recipe\ntags: [deployment, staging]\ndescription: How to deploy to staging',
    );

    spawnCLI(['mem', 'index', '--dir', tmpDir], tmpDir);

    const result = spawnCLI(['mem', 'remember', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Team Knowledge');
    expect(result.stdout).toContain('styleguide/pnpm.md');
    expect(result.stdout).toContain('[pnpm, package-manager]');
    expect(result.stdout).toContain('Always use pnpm not npm');
    expect(result.stdout).toContain('recipes/deploy.md');
    expect(result.stdout).toContain('[deployment, staging]');
    expect(result.stdout).toContain('How to deploy to staging');
    // No raw JSON fields
    expect(result.stdout).not.toContain('"path"');
    expect(result.stdout).not.toContain('"type"');
  });

  it('mem remember auto-indexes when mem.json missing', () => {
    writeMd(
      tmpDir,
      'recipes/deploy.md',
      'type: recipe\ntags: [deployment]\ndescription: Deploy guide',
    );

    // Do NOT run mem index — remember should auto-index
    const result = spawnCLI(['mem', 'remember', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Team Knowledge');
    expect(result.stdout).toContain('recipes/deploy.md');
  });

  it('mem remember shows empty-state message when no docs exist', () => {
    const result = spawnCLI(['mem', 'remember', '--dir', tmpDir], tmpDir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No team knowledge indexed yet');
  });
});
