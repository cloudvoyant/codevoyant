import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT, parseFrontmatter } from './helpers.js';

const marketplacePath = join(REPO_ROOT, '.claude-plugin/marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf-8'));

describe('Claude marketplace.json', () => {
  it('is valid JSON with no trailing commas', () => {
    expect(() => JSON.parse(readFileSync(marketplacePath, 'utf-8'))).not.toThrow();
  });

  it('has required top-level fields', () => {
    expect(marketplace).toHaveProperty('name');
    expect(marketplace).toHaveProperty('plugins');
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBeGreaterThan(0);
  });

  it('each plugin entry has name, description, and source', () => {
    for (const plugin of marketplace.plugins) {
      expect(plugin, `plugin missing name`).toHaveProperty('name');
      expect(plugin, `${plugin.name} missing description`).toHaveProperty('description');
      expect(plugin, `${plugin.name} missing source`).toHaveProperty('source');
    }
  });

  it('each plugin source path exists on disk', () => {
    for (const plugin of marketplace.plugins) {
      const sourcePath = join(REPO_ROOT, plugin.source);
      expect(existsSync(sourcePath), `${plugin.name}: source path not found at ${sourcePath}`).toBe(true);
    }
  });
});

describe('Claude plugin manifests', () => {
  for (const plugin of marketplace.plugins) {
    const pluginDir = join(REPO_ROOT, plugin.source);
    const manifestPath = join(pluginDir, '.claude-plugin/plugin.json');

    it(`${plugin.name}: plugin.json exists and is valid`, () => {
      expect(existsSync(manifestPath), `missing ${manifestPath}`).toBe(true);
      expect(() => JSON.parse(readFileSync(manifestPath, 'utf-8'))).not.toThrow();
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('version');
    });

    it(`${plugin.name}: has at least one skill`, () => {
      const skillsDir = join(pluginDir, 'skills');
      expect(existsSync(skillsDir), `${plugin.name} has no skills/ dir`).toBe(true);
      const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      expect(skills.length, `${plugin.name} has no skill subdirectories`).toBeGreaterThan(0);
    });
  }
});

describe('SKILL.md structure', () => {
  for (const plugin of marketplace.plugins) {
    const skillsDir = join(REPO_ROOT, plugin.source, 'skills');
    if (!existsSync(skillsDir)) continue;

    const skills = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const skill of skills) {
      const skillFile = join(skillsDir, skill, 'SKILL.md');

      it(`${plugin.name}:${skill} — SKILL.md exists`, () => {
        expect(existsSync(skillFile), `missing ${skillFile}`).toBe(true);
      });

      it(`${plugin.name}:${skill} — has description in frontmatter`, () => {
        const content = readFileSync(skillFile, 'utf-8');
        const fm = parseFrontmatter(content);
        expect(fm.description, `${plugin.name}:${skill} missing frontmatter description`).toBeTruthy();
      });

      it(`${plugin.name}:${skill} — frontmatter opens and closes with ---`, () => {
        const content = readFileSync(skillFile, 'utf-8');
        expect(content.startsWith('---\n'), `${plugin.name}:${skill} frontmatter must start with ---`).toBe(true);
        const secondDash = content.indexOf('\n---', 3);
        expect(secondDash, `${plugin.name}:${skill} frontmatter not closed`).toBeGreaterThan(0);
      });
    }
  }
});
