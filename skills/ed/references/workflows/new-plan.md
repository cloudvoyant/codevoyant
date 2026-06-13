# new-plan — create a week-by-week learning plan

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `SLUG` — kebab-case of TOPIC
- `PLAN_DIR` — `plans/{SLUG}/`
- `PLAN_FILE` — `plans/{SLUG}/plan.md`
- `SYLLABUS` — file path from `--syllabus` (optional)
- `WEEKS` — integer from `--weeks` (optional; auto-detected or defaults to 12)

## Step 0: Parse args

Parse TOPIC, SYLLABUS, WEEKS from REMAINING_ARGS.

If TOPIC is empty, ask (AskUserQuestion, free-text via Other): "What course or topic is this learning plan for?"

## Step 1: Load syllabus or research

**If SYLLABUS provided:** Read the file. Extract:
- Course title and duration (number of weeks/modules)
- Topics per week in order
- Any required readings or assignments per week
- Set `WEEKS` from syllabus duration if not overridden

**If no SYLLABUS:** Launch deep-research agent:
```
You are a curriculum designer helping a graduate ML student plan their study of "{TOPIC}".

Find:
1. The canonical graduate-level course structure for {TOPIC} (e.g. Stanford CS229, CS231n, CS224n, or equivalent)
2. The best freely-available resources: lecture notes, video lectures, textbook chapters, seminal papers
3. A natural week-by-week breakdown covering the topic in {WEEKS} weeks at graduate level

For each week, return:
- week number
- topic(s) covered
- 2–3 resources with titles and URLs
- 1–2 learning objectives

Return as structured data.
```

Store result as `CURRICULUM`.

## Step 2: Write plan file

```markdown
# Learning Plan: {TOPIC}

> *{WEEKS}-week graduate-level study plan.*
> *Sources: {syllabus filename if provided, else "deep research"}*

## Overview

{2–3 sentences on what this plan covers and what the student will be able to do at the end.}

## Week-by-Week Schedule

### Week {N}: {Topic}

**Topics:** {comma-separated list}

**Objectives:**
- {What you should understand by end of week}
- {What you should be able to do}

**Resources:**
- [{title}]({url}) — {one-line description}
- [{title}]({url}) — {one-line description}

**Self-check questions:**
1. {Question to verify understanding}
2. {Question to verify understanding}

---

{Repeat for all WEEKS}

## Milestones

| Week | Milestone |
|------|-----------|
| {N}  | {Concrete checkpoint — e.g. "Complete attention mechanism implementation"} |
| ...  | ... |

## References

{All resources compiled in one place, clickable links}
```

## Step 3: Write file and report

```bash
mkdir -p plans/{SLUG}
```

Write plan to `PLAN_FILE`.

Report:
```
✅ Plan ready: {PLAN_FILE}

  {WEEKS} weeks · {topic count} topics
  {Based on: {syllabus} / deep research}

To annotate: add > or >> comments, then run /ed update {PLAN_FILE}
To create notes for a week: /ed new notes "{week topic}" --resources {any slides}
```
