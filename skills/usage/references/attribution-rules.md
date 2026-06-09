# Attribution Rules Reference

Quick reference for the report workflow. Full explanations in `methodology.md`.

## Commit Type Lookup

```
feat          → weighted (use Decision Log ratio)
fix           → weighted (use Decision Log ratio)
perf          → weighted (use Decision Log ratio)
chore         → user
refactor      → user
docs          → user
test          → user
style         → user
revert        → user
release       → user
chore(release) → user
```

## Weighted Attribution Fallback

When `feat`/`fix`/`perf` commits exist but no Decision Log is available:
- Default to **medium** confidence user direction (60% user / 40% agent)
- Note the fallback in the report

## Review Round Detection

Scan conversation context for:
- `/code-review` invocations with any instruction argument
- `spec review {plan}` invocations
- `spec update` invocations (implies user added annotations)
- Any user message containing "review", "check", "ensure", "make sure" directed at the agent about specific concerns
- Inline `>` annotation markers in plan files (these come from user edits)

Each distinct invocation/annotation session = 1 review round.

## Vibecoded Checklist

All five must be true for vibecoded classification:
- [ ] Zero `[user]` Decision Log entries (excluding "I want X" intent statements)
- [ ] Zero review rounds detected
- [ ] No user annotations in any plan file
- [ ] No user corrections visible in conversation context
- [ ] All `feat`/`fix` commits are agent-attributed (no user-direction signals)

## Responsible AI Score Quick Calc

```
user_pct = user_decisions / (user_decisions + agent_decisions) * 100

if vibecoded_checklist_all_true:
    score = "vibecoded"
elif user_pct >= 50 AND review_rounds >= 1:
    score = "high"
elif user_pct >= 25 OR review_rounds >= 1:
    score = "medium"
else:
    score = "low"
```

## Hard Rules (never override)

1. Do NOT add `Co-Authored-By` to any commit, example, or template output
2. Do NOT suggest the user add AI attribution to commits
3. Do NOT classify authorship as belonging to the agent — only attribution of specific decisions
4. The Authorship Statement section is mandatory in every report
