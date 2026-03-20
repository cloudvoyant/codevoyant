---
description: 'Use when the user wants to capture or recall team knowledge. Triggers on: "mem learn", "remember this", "learn this", "our rule is", "remind me about", "what did we decide on". Two modes: learn (capture) and recall (lookup).'
argument-hint: '<knowledge or question>'
---

Two modes -- detect from user message:

## Learn Mode

Triggered by teaching phrases: "remember: X", "learn: X", "our rule is X", "from now on X".

### Steps

1. Extract the knowledge from the user's message.

2. Infer the type (`recipe` or `styleguide`) and tags from content. If ambiguous, ask:

```
AskUserQuestion:
  question: "What type of knowledge is this?"
  options:
    - "styleguide -- a convention or rule the team follows"
    - "recipe -- a how-to guide or procedure"
```

3. Ask for a one-sentence description if one cannot be clearly inferred:

```
AskUserQuestion:
  question: "One-sentence description for this knowledge doc?"
```

4. Slug the subject into a filename (e.g., "always use pnpm" -> `pnpm-over-npm.md`).

5. Choose the appropriate directory based on type:
   - `styleguide` -> `styleguide/` directory
   - `recipe` -> `recipes/` directory

6. Write the `.md` file with frontmatter:

```yaml
---
type: styleguide | recipe
tags: [inferred, tags]
description: One-sentence summary
status: active
---
```

Then the knowledge content as markdown body.

7. Run index:
```bash
npx @codevoyant/agent-kit mem index
```

8. Confirm:
```
Learned: styleguide/pnpm-over-npm.md
```

## Recall Mode

Triggered by lookup phrases: "remind me about X", "what did we decide on Y", "what's our rule for Z".

### Steps

1. Infer type and/or tags from the question.

2. Run:
```bash
npx @codevoyant/agent-kit mem find --type <inferred> --tag <inferred> --json
```

3. Read the matching files.

4. Answer the user's question from the content of those files.

If no matches found, say so and suggest `/mem:learn` to capture new knowledge.
