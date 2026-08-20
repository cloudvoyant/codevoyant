# arg-handling — the cross-agent dispatcher argument contract

Canonical reference for how a dispatcher skill receives and parses its arguments. Every dispatcher skill (one whose Step 0 extracts a verb from the invocation) must follow this contract so it behaves identically on every agent.

## How arguments arrive

Agents deliver slash-command arguments differently:

- **Claude Code** appends the text after the command inline to the skill invocation, and substitutes `$ARGUMENTS` / `$ARGUMENTS[N]` / `$N` / `$name` (named via `arguments:` frontmatter) NATIVELY inside a SKILL.md body. `/spec new my-feature` reaches the dispatcher as `new my-feature`.
- **OpenCode** registers every skill as a slash command, so `/spec new my-feature` runs the SKILL.md body through the same template pipeline as commands: `$ARGUMENTS` becomes the raw remainder (quotes preserved), and `$N` becomes the Nth positional token — with a quirk that the highest-numbered `$N` in the body consumes all remaining tokens. A body containing no `$ARGUMENTS`/`$N` tokens gets the raw remainder appended as a trailing paragraph. When OpenCode's model instead loads a skill by name via the `skill` tool, no substitution happens — the model reads the args from the user's message.
- **Other agents** (VS Code Copilot, Codex, …) may pass args inline, via `$ARGUMENTS`, or not at all.

A dispatcher must therefore treat arguments as a hint, never a platform guarantee. Substitution is inconsistent across platforms — and absent entirely when a skill is loaded by name — which is why skill bodies embed `$ARGUMENTS` as a Step 0 capture point but never rely on it alone: the dispatcher also falls back to parsing the invocation from the user's message (contract rule 2).

## The contract

1. **Parse the invocation from the current request, not a magic variable.** Read the verb and remaining args from the user's current message / the invocation that triggered the skill. Do not assume a platform injected them into a specific field.
2. **Embed `$ARGUMENTS` as the capture point; never use `$N`.** Slash commands on Claude Code and OpenCode substitute `$ARGUMENTS` inline with the raw remainder (quotes preserved), so a dispatcher's Step 0 reads the verb and remaining args FROM the `$ARGUMENTS` value. Never use `$N` positional tokens: on OpenCode the highest-numbered `$N` in the body greedily consumes all remaining tokens, and on agents that don't substitute `$N` stays literal. When a skill is loaded by name (no slash command — e.g. OpenCode's `skill` tool), `$ARGUMENTS` also stays literal: parse the invocation from the user's message instead. And when args are absent, `$ARGUMENTS` expands to nothing — treat that as an empty invocation and ask.
3. **A missing verb is a question, never silent help.** If no verb can be parsed (empty invocation, or the first token is not a known verb), ASK the user what they want using AskUserQuestion. On non-Claude-Code platforms AskUserQuestion falls back to a numbered list. Do NOT silently run `help.md`.
4. **Preserve the remaining args.** After the verb is known, pass everything after it through unchanged (order and flags preserved) to the workflow.
5. **`help` is still a verb.** A user who explicitly types `help` (or an unknown verb) gets the help workflow — the ask-when-missing rule applies only when nothing parseable was typed.
6. **Declare `argument-hint`.** The frontmatter `argument-hint` field tells the UI what args look like; keep it accurate so users type the right shape.

## Worked example (spec dispatcher)

```markdown
## Step 0: Parse Arguments

Read the invocation from the current request. The raw invocation args are: `$ARGUMENTS` (filled by Claude Code / OpenCode slash commands; if this line is not filled in, read the verb and remaining args from the user's current message). VERB = first non-flag argument; REMAINING_ARGS = everything after VERB (order and flags preserved).

If VERB is empty (nothing parseable was typed), ASK the user (AskUserQuestion: "What would you like to do? new / go / review / update / clean / help" — numbered-list fallback on non-Claude-Code platforms). Do not silently run help. If the user explicitly typed `help` or an unrecognized verb, run help.
```

## When to skip this contract

Purely cheatsheet/recipe skills (vim, hx, zellij, cz, …) that take a query but have no verb dispatch still benefit from asking when the query is empty — but they do not need the verb-dispatch wording. Use judgment: the ask-when-missing rule applies to every skill that reads input; the VERB/REMAINING_ARGS structure applies to dispatcher skills only.
