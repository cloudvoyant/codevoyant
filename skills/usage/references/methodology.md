# Attribution Methodology

This document defines how the `usage` skill attributes decisions and evaluates responsible AI usage.

## Core Principle: Code Generation ≠ Authorship

**Code generation** is the act of an LLM producing text that becomes source code, configuration, or documentation. It is a tool activity — no different in kind from autocomplete or a code template.

**Authorship** is the human act of directing, reviewing, approving, and taking responsibility for work. The author is always the person who:
- Specified what to build and why
- Reviewed the output and decided it was acceptable
- Committed (literally and figuratively) to shipping it

**Conclusion:** In nearly all codevoyant sessions, the human is the author. The AI is the instrument. The only exception is fully vibecoded work (see below).

## Attribution Sources (in priority order)

### 1. Decision Log entries (primary)

Plan files contain a structured `## Decision Log` with:
- `[user]` entries — decisions explicitly mandated or chosen by the user
- `[agent]` entries — autonomous design choices made by the planner or executor

These are the most reliable signal because they were recorded at decision time.

### 2. Review rounds (user control assertions)

Any of the following count as the user asserting meaningful control:
- Running `/code-review` with specific instructions (e.g. "check for security issues")
- Adding inline `>` or `>>` annotations to a plan and running `spec update`
- Giving the agent explicit correction ("no, don't do that — do X instead")
- Running `spec review` before `spec go`
- Reviewing and approving a plan before executing it

Each review round is noted in the report as a control assertion.

### 3. Commit type defaults

When Decision Log entries are absent for a given commit, apply these defaults:

| Commit type | Default attribution | Rationale |
|---|---|---|
| `feat` | weighted | New features — depends on how much direction the user gave |
| `fix` | weighted | Bug fixes — direction matters; agent rarely finds bugs unprompted |
| `chore` | user | Maintenance decisions are almost always user-directed |
| `refactor` | user | Structural changes reflect user's architectural judgment |
| `docs` | user | Documentation choices are editorial — the user's voice |
| `test` | user | Test strategy is a user decision even when agent writes test code |
| `style` | user | Style/formatting are user-governed by their config choices |
| `perf` | weighted | Performance work — depends on who identified the need |
| `revert` | user | Reverting is always a human decision |
| `release` / `chore(release)` | user | Shipping is a human decision |

**"weighted"** means: compute the agent/user ratio from the Decision Log for that branch and apply it to that commit's code volume.

### 4. Vibecoded work

Work is classified as **vibecoded** when ALL of the following are true:
- No user decisions are logged (or user decisions are only "I want X" with no follow-up direction) — there is a threshold: when there is no architectural, stylistic guidance, decisions around codebase structure, dependency selection, etc.
- No review rounds occurred
- User accepted all agent output without annotation or correction
- Commits are predominantly `feat` with no user-attributed commits

Vibecoded work may or may not indicate irresponsible AI usage depending on the criticality of the work. Quick POCs and prototypes are appropriate for vibe coding; work landing in production is not. The report notes this classification and flags the criticality concern when applicable.

## Responsible AI Score

Computed from the combination of decision attribution and review rounds:

| Score | Criteria |
|---|---|
| **High** | >=50% user decisions in Decision Log AND >=1 review round |
| **Medium** | >=25% user decisions OR >=1 review round (but not both threshold) |
| **Low** | <25% user decisions AND no review rounds AND not vibecoded |
| **Vibecoded** | All vibecoded criteria met (see above) |

The score is an evaluation of engagement, not quality. High-quality vibecoded work is still vibecoded.

## What Is Never Attributed to the Agent

- The decision to ship / not ship
- The decision to start / cancel the session
- Commit messages (the human commits; the tool may draft)
- PR titles, descriptions, and merge decisions
- Any text that appears as a git commit author line

## Co-Authored-By Prohibition

The `Co-Authored-By: Claude` pattern (and all variants) must **never** appear in:
- Commit messages
- PR descriptions
- Any generated documentation
- Any template or example in this skill

**Exception — vibecoded sessions:** If the session is classified as `vibecoded` (developer delegated most decisions to the agent with minimal direction), `Co-Authored-By` attribution in commits is acceptable and may be included at the developer's discretion. The usage report will note this classification and the reason for the exception.

Reason: the prohibition exists because the pattern misrepresents authorship when a human is directing and reviewing the work. In a vibecoded session that distinction no longer applies.
