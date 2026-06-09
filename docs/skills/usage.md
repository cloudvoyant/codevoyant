---
title: usage
---

# usage

Generate responsible-AI usage and decision-attribution reports for the current session.

## Commands

**`/usage report [name]`** — analyze session artifacts (Decision Logs, git history, review rounds) and write a structured attribution report to `.codevoyant/usage/`.

- On a `feature/*` branch with no name: `{feature-slug}-{date}.md`
- With an inline name: `{name}-{date}.md`
- Fallback: `{date}.md`

**`/usage help`** — print command reference.

## Aliases

- `/usage generate` — same as `/usage report`
- `/usage run` — same as `/usage report`

## What the Report Includes

- **Authorship Statement** — code generation is a tool activity; authorship belongs to the user unless the session was truly undirected (vibecoded)
- **Decision Attribution** — each Decision Log entry typed as `[user]` or `[agent]` with source context
- **Commit Classification** — commits typed by conventional prefix; chore/refactor/docs default to user attribution
- **Review Rounds** — explicit user instructions to review tools captured as user control assertions
- **Responsible AI Evaluation** — categorical score: `HIGH`, `MEDIUM`, `LOW`, or `VIBECODED`
- **Methodology Summary** — brief description of how the score was derived

## Requirements

- Active `.codevoyant/plans/` with Decision Log entries (User Decisions / Agent Decisions sections)
- Git history on the current branch

## References

- [Attribution methodology](https://github.com/cloudvoyant/codevoyant/blob/main/skills/usage/references/methodology.md)
- [ACM Code of Ethics](https://www.acm.org/code-of-ethics)
