# new-syllabus — create a week-by-week learning syllabus

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `SLUG` — kebab-case of TOPIC
- `ART_ROOT` — `.codevoyant` by default; override via `--dir <path>` (see `references/artifact-dir.md`)
- `SYLLABUS_DIR` — `{ART_ROOT}/syllabus/{SLUG}/`
- `SYLLABUS_FILE` — `{ART_ROOT}/syllabus/{SLUG}/syllabus.md`
- `SOURCE` — file path from `--syllabus` (optional; an existing course syllabus to follow)
- `WEEKS` — integer from `--weeks` (optional; auto-detected or defaults to 12)

## Step 0: Parse args

Parse TOPIC, SOURCE, WEEKS from REMAINING_ARGS. Resolve ART_ROOT per `references/artifact-dir.md`.

If TOPIC is empty, ask (AskUserQuestion, free-text via Other): "What course or topic is this syllabus for?"

## Step 1: Load syllabus or research

**If SOURCE provided:** Read the file. Extract:
- Course title and duration (number of weeks/modules)
- Topics per week in order
- Any required readings or assignments per week
- Set `WEEKS` from source duration if not overridden

**If no SOURCE:** Launch deep-research agent:
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

## Step 2: Write syllabus file

```markdown
# Learning Syllabus: {TOPIC}

> *{WEEKS}-week graduate-level syllabus.*
> *Sources: {SOURCE filename if provided, else "deep research"}*

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
mkdir -p {ART_ROOT}/syllabus/{SLUG}
```

Write to `SYLLABUS_FILE`.

Report:
```
✅ Syllabus ready: {SYLLABUS_FILE}

  {WEEKS} weeks · {topic count} topics
  {Based on: {SOURCE} / deep research}

To make a note per entry:  /ed new notes "{TOPIC}" --syllabus {SYLLABUS_FILE}
To make a guide per entry: /ed new guide "{TOPIC}" --syllabus {SYLLABUS_FILE}
To annotate: add > or >> comments, then run /ed update {SYLLABUS_FILE}
```
