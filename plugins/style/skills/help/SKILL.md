---
description: List all style commands with descriptions, arguments, and when to use them. Use when the user wants to know what style can do, asks for style commands, or is unsure which skill to use. Triggers on: style help, help style, what can style do, style commands, list style skills, style reference.
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
---

List available skills in this plugin. If a skill name is given, show its full description and usage.

## Step 1: Read plugin metadata

Read `$SKILL_DIR/../../.claude-plugin/plugin.json` to get the plugin name and description.

## Step 2: Discover skills

Use Glob with pattern `*/SKILL.md` in path `$SKILL_DIR/..` to find all sibling skill files.

For each found file:
- Read the frontmatter
- Extract: `description` (first sentence — up to the first `.`), `argument-hint`, `disable-model-invocation`, `user-invocable`
- Skip any skill where `user-invocable: false`
- Skip the `help` skill itself

## Step 3: Display

If no argument given, show the full plugin reference:

```
{plugin-name} — {plugin description}

  /style:{skill}  [{argument-hint}]
      {first sentence of description}

  /style:{skill}  [{argument-hint}]
      {first sentence of description}

  ...

Run /style:help <skill> for details on a specific skill.
```

Sort skills alphabetically. If `disable-model-invocation: true`, append `(invoke explicitly)` after the skill name.

If a specific skill name was given as argument, read that skill's SKILL.md and display its full description, argument-hint, and all flags mentioned in the body.
