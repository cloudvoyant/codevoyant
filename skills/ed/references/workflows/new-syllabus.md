# new-syllabus — create a module-based learning syllabus

Organize a syllabus by **modules** (self-contained units of study), not calendar weeks. A learner moves through modules at their own pace; each module is a coherent chunk of the topic, not a fixed week.

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `SLUG` — kebab-case of TOPIC
- `ART_ROOT` — `.codevoyant` by default; override via `--dir <path>` (see `references/artifact-dir.md`)
- `SYLLABUS_DIR` — `{ART_ROOT}/syllabus/{SLUG}/`
- `SYLLABUS_FILE` — `{ART_ROOT}/syllabus/{SLUG}/syllabus.md`
- `SOURCE` — file path from `--syllabus` (optional; an existing course syllabus to follow)
- `MODULES` — integer from `--modules` (optional; `--weeks` accepted as a back-compat alias; auto-detected from SOURCE, else defaults to 8)

## Step 0: Parse args

Parse TOPIC, SOURCE, MODULES from REMAINING_ARGS (accept `--weeks` as an alias for `--modules`). Resolve ART_ROOT per `references/artifact-dir.md`.

If TOPIC is empty, ask (AskUserQuestion, free-text via Other): "What course or topic is this syllabus for?"

## Step 1: Load syllabus or research

**If SOURCE provided:** Read the file. Extract:
- Course title and how it splits into units/modules (map weeks or lectures onto modules if the source is week-based)
- Topics per module in order
- Any required readings or assignments per module
- Set `MODULES` from the source's natural unit count if not overridden

**If no SOURCE:** Launch deep-research agent:
```
You are a curriculum designer helping a graduate ML student plan their study of "{TOPIC}".

Find:
1. The canonical graduate-level course structure for {TOPIC} (e.g. Stanford CS229, CS231n, CS224n, or equivalent)
2. The best freely-available resources: lecture notes, video lectures, textbook chapters, seminal papers
3. A natural breakdown into {MODULES} self-contained modules at graduate level — group by concept, not calendar. Each module is a coherent unit a learner can complete before moving on.

For each module, return:
- module number and a short title
- topic(s) covered
- rough effort (e.g. "~4–6 hours") — a guide, not a deadline
- 2–3 resources with titles and URLs
- 1–2 learning objectives

Return as structured data.
```

Store result as `CURRICULUM`.

## Step 2: Write syllabus file

```markdown
# Learning Syllabus: {TOPIC}

> *{MODULES}-module graduate-level syllabus. Self-paced — modules are units of study, not weeks.*
> *Sources: {SOURCE filename if provided, else "deep research"}*

## Overview

{2–3 sentences on what this plan covers and what the student will be able to do at the end.}

## Modules

### Module {N}: {Title}

**Topics:** {comma-separated list}

**Estimated effort:** {e.g. ~4–6 hours — a guide, not a deadline}

**Objectives:**
- {What you should understand after this module}
- {What you should be able to do}

**Resources:**
- [{title}]({url}) — {one-line description}
- [{title}]({url}) — {one-line description}

**Self-check questions:**
1. {Question to verify understanding}
2. {Question to verify understanding}

---

{Repeat for all MODULES}

## Milestones

| Module | Milestone |
|--------|-----------|
| {N}    | {Concrete checkpoint — e.g. "Complete attention mechanism implementation"} |
| ...    | ... |

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

  {MODULES} modules · {topic count} topics
  {Based on: {SOURCE} / deep research}

To make a note per module:   /ed new notes "{TOPIC}" --syllabus {SYLLABUS_FILE}
To make one guide per module: /ed new guide "{TOPIC}" --syllabus {SYLLABUS_FILE}   (one guide per syllabus entry)
To annotate: add <!-- > ... --> or <!-- >> ... --> comments, then run /ed update {SYLLABUS_FILE}
```
