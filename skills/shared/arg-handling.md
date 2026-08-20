# arg-handling — the cross-agent dispatcher argument contract

Canonical reference for how a dispatcher skill receives and parses its arguments. Every dispatcher skill (one whose Step 0 extracts a verb from the invocation) must follow this contract so it behaves identically on every agent.

## How arguments arrive

Agents deliver slash-command arguments differently:

- **Claude Code** appends the text after the command inline to the skill invocation, and substitutes `$ARGUMENTS` / `$ARGUMENTS[N]` / `$N` / `$name` (named via `arguments:` frontmatter) NATIVELY inside a SKILL.md body. `/spec new my-feature` reaches the dispatcher as `new my-feature`.
- **OpenCode** loads skills through the `skill` tool, which accepts only a `name` — arguments typed after the command are dropped. It does NOT substitute `$ARGUMENTS` or `$N` inside a SKILL.md body, so a literal token there reaches the model unexpanded.
- **Other agents** (VS Code Copilot, Codex, …) may pass args inline, via `$ARGUMENTS`, or not at all.

A dispatcher must therefore treat arguments as a hint, never a platform guarantee. The substitution asymmetry is why skill bodies must NOT rely on `$ARGUMENTS`/`$N` tokens (contract rule 2) — a token that Claude Code expands is left literal by OpenCode, and a token that both expand leaves nothing when args are absent.

## The contract

1. **Parse the invocation from the current request, not a magic variable.** Read the verb and remaining args from the user's current message / the invocation that triggered the skill. Do not assume a platform injected them into a specific field.
2. **Never embed `$ARGUMENTS` or `$N` substitution tokens in a SKILL.md body.** Claude Code substitutes them natively; OpenCode does NOT substitute them inside skill content, so a literal token there reaches the model unexpanded or is silently dropped. Skill bodies parse the invocation as plain text instead.
3. **A missing verb is a question, never silent help.** If no verb can be parsed (empty invocation, or the first token is not a known verb), ASK the user what they want using AskUserQuestion. On non-Claude-Code platforms AskUserQuestion falls back to a numbered list. Do NOT silently run `help.md`.
4. **Preserve the remaining args.** After the verb is known, pass everything after it through unchanged (order and flags preserved) to the workflow.
5. **`help` is still a verb.** A user who explicitly types `help` (or an unknown verb) gets the help workflow — the ask-when-missing rule applies only when nothing parseable was typed.
6. **Declare `argument-hint`.** The frontmatter `argument-hint` field tells the UI what args look like; keep it accurate so users type the right shape.

## Worked example (spec dispatcher)

```markdown
## Step 0: Parse Arguments

Read the invocation from the current request. VERB = first non-flag argument; REMAINING_ARGS = everything after VERB (order and flags preserved). The invocation may arrive inline (Claude Code) or as a plain message.

If VERB is empty (nothing parseable was typed), ASK the user (AskUserQuestion: "What would you like to do? new / go / review / update / clean / help" — numbered-list fallback on non-Claude-Code platforms). Do not silently run help. If the user explicitly typed `help` or an unrecognized verb, run help.
```

## When to skip this contract

Purely cheatsheet/recipe skills (vim, hx, zellij, cz, …) that take a query but have no verb dispatch still benefit from asking when the query is empty — but they do not need the verb-dispatch wording. Use judgment: the ask-when-missing rule applies to every skill that reads input; the VERB/REMAINING_ARGS structure applies to dispatcher skills only.
