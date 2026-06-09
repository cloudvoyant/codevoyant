# usage — command reference

Generate responsible-AI usage and decision-attribution reports for your codevoyant session.

## Commands

```
/usage report     Analyze session artifacts and write .codevoyant/usage/{date}.md
/usage help       Show this reference
```

## What it reads

- `.codevoyant/plans/*/plan.md` — Decision Logs (User Decisions + Agent Decisions)
- `git log` — commits on the current branch since divergence from main
- Current conversation context — review rounds and explicit user instructions

## What it writes

- `.codevoyant/usage/{YYYY-MM-DD}.md` — the usage output

## Output sections

1. **Session Summary** — branch, plans, commits, review rounds
2. **Authorship Statement** — confirms the human is the author
3. **Decision Attribution** — table of user vs agent decisions by source
4. **Review Rounds** — user control assertions detected
5. **Responsible AI Evaluation** — score (high/medium/low/vibecoded) with rationale
6. **Methodology Summary** — how attribution was computed

## Attribution quick reference

| Commit type | Default |
|-------------|---------|
| chore, refactor, docs, test, style, revert, release | user |
| feat, fix, perf | weighted by Decision Log ratio |
