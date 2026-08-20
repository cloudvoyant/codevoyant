---
description: {description}
---

Load the `{skill}` skill (SKILL.md at ~/.agents/skills/{skill}/SKILL.md) and run its dispatcher with these arguments:

$ARGUMENTS

Follow the skill's Step 0 dispatch logic exactly: VERB = first non-flag argument; dispatch to references/workflows/{VERB}.md, passing all remaining arguments through unchanged as a preserved argv array. If VERB is empty, ask the user what they want (AskUserQuestion, numbered-list fallback on non-Claude-Code platforms) instead of silently running help. If VERB is `help` or an unrecognized verb, dispatch to references/workflows/help.md.
