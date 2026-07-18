# explore — find & vet reference materials for a course

Build a verified, annotated source catalog for a course. Search the six source classes, verify every online URL, and write a single course-wide catalog that later stages ground themselves in. This workflow does **research and cataloging only** — it never scaffolds the book or writes lessons.

## ⛔ HARD STOPS — read before every action

This workflow's **only writes** are `brief.md` (scaffold, if missing) and `explore/sources.md`. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Scaffold the diffbook book / run `/diffbook init` | Stop. That belongs to `plan-syllabus`/`autodidact`, not here. |
| Write `syllabus.md`, a module plan, or any `.mdx` | Stop. Wrong stage. This workflow ends at `sources.md`. |
| Include a URL you have not fetched | Stop. Verify it via WebFetch first; drop or replace dead links. |
| Write a catalog entry with no annotation, or a <20-word one | Stop. Every entry needs a 20–40 word what+why annotation. |
| Proceed while `brief.md` is missing or an empty scaffold | Stop. Scaffold it, open it, and pause for the user (Step 1). |
| Invent sources / URLs from memory without a live search | Stop. Search (WebSearch) and verify (WebFetch) every entry. |

## Variables

- `COURSE` — first non-flag token of REMAINING_ARGS (the course slug; ask if empty)
- `ART_ROOT` — plan-artifact root; default `.codevoyant`, override via `--dir <path>` (see `references/artifact-layout.md`)
- `COURSE_DIR` — `{ART_ROOT}/ed/{COURSE}/`
- `BRIEF_FILE` — `{COURSE_DIR}/brief.md`
- `EXPLORE_DIR` — `{COURSE_DIR}/explore/`
- `SOURCES_FILE` — `{COURSE_DIR}/explore/sources.md`
- `BOOK_HINT` — value after `--book <name>` (optional; a specific OCW course / textbook to anchor the catalog on)
- `BRIEF_CONTEXT` — the filled brief, read in Step 1
- `FANOUT` — true to fan out one subagent per source class (breadth); else serial

## Step 0: Parse args & resolve paths

Parse `COURSE` (first non-flag token) and flags `--dir`, `--book` from REMAINING_ARGS.

If `COURSE` is empty, ask (AskUserQuestion, free-text via Other): "What course is this catalog for? (give a short slug, e.g. `transformers`, `distributed-systems`)".

Slug `COURSE` per the rule in `references/artifact-layout.md` (kebab-case: lowercase, spaces→hyphens, alphanumeric+hyphens, ≤50 chars). Resolve `ART_ROOT`, then `COURSE_DIR`, `BRIEF_FILE`, `EXPLORE_DIR`, `SOURCES_FILE` from it using the resolve snippet in `references/artifact-layout.md`.

```bash
mkdir -p "{EXPLORE_DIR}"
```

## Step 1: Brief gate (pause point)

The brief is the structured intent every later stage reads. It must be filled by the user before research begins.

Read `BRIEF_FILE` if it exists.

**If `BRIEF_FILE` is missing, or contains only the empty scaffold** (the required fields are still `{…}` placeholders / empty — same "beyond the scaffold" test spec uses for intent files):

a. Create it from the template:
   ```bash
   mkdir -p "{COURSE_DIR}"
   ```
   Write `BRIEF_FILE` from `references/templates/brief-template.md`, substituting `{COURSE}`.

b. Print the clickable path:
   ```
   📝 Tell me what you want to learn — fill in:
      {BRIEF_FILE}
   ```

c. Best-effort open + focus it in the user's editor. Never block, never fail the workflow if no editor is available:
   ```bash
   f="{BRIEF_FILE}"
   if command -v code >/dev/null 2>&1; then code -r -g "$f" 2>/dev/null
   elif command -v cursor >/dev/null 2>&1; then cursor -r -g "$f" 2>/dev/null
   elif command -v open >/dev/null 2>&1; then open "$f" 2>/dev/null       # macOS
   elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$f" 2>/dev/null # Linux
   fi
   ```

d. **STOP** with: `Fill it in, then run /ed explore {COURSE} again — I'll read your brief and start vetting sources.`

   Do NOT write `sources.md` or search in this mode. This is a deliberate pause.

**If `BRIEF_FILE` is filled in:** read it fully into `BRIEF_CONTEXT` and proceed to Step 2. Note the brief's `preferred_sources`, `source_material_paths` (local files/dirs the user already has), `topic`, `constraints`, and any named OCW course/textbook to anchor on.

## Step 2: Research the six source classes

Follow `references/source-tiers.md` — its class list, reliability hierarchy, and hard rules govern everything below. Seek entries in each of the **6 source classes**:

1. **Textbooks** — open/available texts (cite title/author/publisher/edition; avoid fragile URLs).
2. **OCW** — MIT OpenCourseWare first, then Stanford / CMU / Berkeley / etc. course sites.
3. **Papers** — arXiv / ACL / NeurIPS / ICML / ICLR / JMLR + seminal works.
4. **GitHub repos** — reference implementations, course code, problem sets.
5. **YouTube lecture series** — named course playlists.
6. **Blogs/notes** — reputable canonical notes (distill, Lil'Log, official course notes).

Honor the brief: prioritize `preferred_sources`, include and read any `source_material_paths` (local; Read/Glob them — no URL verification needed), and respect any exclusions. If `BOOK_HINT` or the brief names a course/text, anchor the search on it and its sibling readings.

**Search each class** via WebSearch, then **verify every candidate URL via WebFetch** before keeping it. A URL that 404s, redirects to an unrelated page, or is paywalled beyond the cited artifact → drop it or replace it with a live equivalent. Textbooks may be listed without a URL (bibliographic citation only).

**Fan-out (optional, `FANOUT=true`):** For breadth you MAY dispatch one `general-purpose` subagent per source class in parallel. Give each an inline prompt like:

```
You are a research scout finding {SOURCE_CLASS} for a graduate course on "{topic from BRIEF_CONTEXT}".
Scope/constraints: {relevant brief fields — preferred_sources, exclusions, anchor course}.

Find the strongest {SOURCE_CLASS} entries for this course. For EACH entry:
- title (+ author/publisher/edition for textbooks)
- URL (except textbooks, which may be bibliographic only)
- VERIFY every URL with WebFetch — report the fetched-page confirmation; DROP anything dead/wrong/paywalled.
- a 20–40 word annotation stating WHAT it covers and WHY it's relevant to this course
- which anticipated modules/topics it best serves

Return only verified entries as a structured list. Do not fabricate URLs; every link must have been fetched.
```

Otherwise do the six classes serially yourself. Collect all verified entries.

## Step 3: Write the source catalog

Write `SOURCES_FILE` using the **catalog schema from `references/source-tiers.md`**: grouped by source class, ordered within each class by the reliability hierarchy. Every entry carries:

- title (and author/publisher/edition for textbooks),
- URL (verified) — or bibliographic-only for textbooks / local `source_material_paths`,
- a **20–40 word** annotation: *what it covers* + *why it's relevant* (follow the good/bad examples in `source-tiers.md`),
- a **verified** flag (`✅ {date}` with the WebFetch confirmation, or `n/a (book)` / `local` for `source_material_paths`).

**Coverage rule:** the catalog must be able to supply **≥1 primary text source per module**. Sketch the likely module set from the brief's scope to check this; if a topic area has no primary text source, keep searching or note the gap explicitly. Write the Part-2 "Grounding by module" sections with a `**Primary text:**` line per anticipated module.

**Recommended course spine:** if the brief did NOT pin an OCW course/textbook, add a short "Recommended course spine" note at the top of the catalog — the OCW course or textbook (from `source-tiers.md`'s recommendation logic) whose structure `plan-syllabus` should follow, with a one-line justification. If the brief pinned one, record it here instead.

## Step 4: Report

Report a summary:

```
✅ Source catalog ready: {SOURCES_FILE}

  Verified entries by class:
    textbooks: {n} · OCW: {n} · papers: {n} · repos: {n} · youtube: {n} · blogs: {n}
  Recommended spine: {anchor or recommended course/text}
  Gaps: {any anticipated module/topic with no primary text source, or "none"}

Next:  /ed plan-syllabus {COURSE}
```

If there are coverage gaps, name them and suggest the user refine the brief's `preferred_sources` and re-run, or accept the gap. Do not proceed past this report — `plan-syllabus` is the next stage.
