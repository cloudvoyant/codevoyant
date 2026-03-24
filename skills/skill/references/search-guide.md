# Search Guide — npx skills CLI and agentskill.sh

Reference for Agent A and Agent B in skill:explore Step 2.

## npx skills CLI

### Keyword search

```bash
npx skills find "<query>"
# or
npx skills search "<query>"
```

Searches across all published skills by name, description, and tags. Returns a list of matching skills with owner/repo identifiers and short descriptions.

### Tag-filtered listing

```bash
npx skills list --tag <tag>
```

Lists all skills carrying a specific tag (e.g. `git`, `ci`, `review`, `docs`). Use when the topic maps cleanly to a known tag rather than a free-text query.

### Skill detail lookup

```bash
npx skills info <owner/repo@skill>
```

Returns full metadata for a specific skill: description, install command, repo URL, star count, last-updated date, and declared dependencies. Use after identifying candidates from `find` or `list`.

### Install command (do NOT run without approval)

```bash
npx skills install <owner/repo@skill>
```

Installs the skill into the current project. Never run this automatically — always present the command to the user and wait for explicit approval.

## agentskill.sh — Direct browsing

agentskill.sh is a curated index of agent skills. URL patterns for direct browsing:

- Home / all skills: `https://agentskill.sh`
- Tag filter: `https://agentskill.sh/?tag=<tag>`
- Skill detail page: `https://agentskill.sh/<owner>/<skill-name>`

When using WebFetch, fetch the tag-filtered URL first, then follow individual skill links for the top 5 results to retrieve repo URLs and summaries.

## Extracting SKILL.md from a GitHub repo

Once you have a GitHub repo URL (`https://github.com/<owner>/<repo>`), fetch the SKILL.md via the raw content CDN:

```
https://raw.githubusercontent.com/<owner>/<repo>/main/SKILL.md
```

If that 404s, try:

```
https://raw.githubusercontent.com/<owner>/<repo>/main/skills/<skill-name>/SKILL.md
https://raw.githubusercontent.com/<owner>/<repo>/master/SKILL.md
```

Extract the frontmatter block (between the `---` delimiters) and the first 50 lines of body content. Record:

- `name` field — canonical skill identifier
- `description` field — trigger phrases and purpose
- `argument-hint` field — supported arguments
- `compatibility` field — platform notes
- Step count and agent structure (how many agents, which models)
- Any `references/` files declared

These details feed the absorb assessment in Step 3.
