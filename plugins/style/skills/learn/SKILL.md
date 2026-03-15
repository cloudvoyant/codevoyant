---
description: Learn style patterns and suggest or apply rules to CLAUDE.md. Source can be the current session, the codebase, a specific directory, or a remote repo. Use when the user wants to discover, capture, or auto-generate style rules from any source. Triggers on keywords like learn style, extract patterns, update style guide, discover conventions, analyze patterns, learn from codebase.
argument-hint: "[session|repo|dir <path>|remote <url>] [--apply]"
disable-model-invocation: true
model: claude-sonnet-4-6
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: |
            INPUT=$(cat); FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty'); if [[ "$FILE" == *"patterns.json" ]]; then if ! jq empty "$FILE" 2>/dev/null; then echo "⚠️  patterns.json is invalid JSON after write — review manually" >&2; fi; fi
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Discover style patterns from any source and suggest or apply rules to CLAUDE.md.

## Usage

```
/style:learn                     # ask what source to learn from
/style:learn session             # session interaction patterns (corrections, tool usage)
/style:learn repo                # current codebase (code, git history, configs)
/style:learn dir path/to/sub     # specific subdirectory
/style:learn remote <url>        # clone and analyze a remote repo
--apply                          # auto-apply high-confidence patterns without asking
```

## Step 0: Parse Arguments

```bash
SOURCE=""        # session | repo | dir | remote
SOURCE_PATH="."  # for dir scope
SOURCE_URL=""    # for remote scope
AUTO_APPLY=false # --apply flag
TEMP_DIR=""      # for remote clone cleanup
```

Parse `$ARGUMENTS`. If no source given → Step 0.5.

## Step 0.5: Ask Source (if no argument)

Use **AskUserQuestion**:
```
question: "What should I learn style patterns from?"
header: "Learn Style Patterns"
multiSelect: false
options:
  - label: "This session"
    description: "Corrections and patterns from your recent interactions"
  - label: "This codebase"
    description: "Scan code, git history, and configs for existing conventions"
  - label: "A specific directory"
    description: "Analyze a subdirectory (will ask which path)"
  - label: "A remote repository"
    description: "Clone and analyze another repo (will ask for URL)"
```

If "A specific directory": ask for path. If "A remote repository": ask for URL.

---

## Step 1: Collect Patterns by Source

### Session source

Read `.codevoyant/style/patterns.json`. These are pre-accumulated observations from past interactions:

```json
{
  "patterns": [
    {
      "id": "use-justfile",
      "type": "tool-correction",
      "pattern": "bash → justfile",
      "observations": [...],
      "count": 3,
      "confidence": 0.85,
      "contexts": ["build", "tools"],
      "status": "ready|candidate|observing"
    }
  ]
}
```

Also scan recent git log and file edits for new patterns not yet in patterns.json:
- Commit message format consistency (conventional commits?)
- Which tools are corrected most (bash → just, etc.)
- Repeated action sequences

Add new observations to patterns.json before analysis.

### Repo / Dir source

Scan the target path (`.` for repo, `SCOPE_PATH` for dir):

**Detect technologies:**
```bash
find {path} -name "*.ts" -not -path "*/node_modules/*" | wc -l  # TypeScript
find {path} -name "*.py" | wc -l                                 # Python
[ -f justfile ] && BUILD_TOOL="justfile"
[ -f Makefile ] && BUILD_TOOL="Makefile"
[ -f tsconfig.json ] && HAS_TSCONFIG=true
[ -f .eslintrc.* ] && HAS_ESLINT=true
```

**Extract patterns from code** (sample up to 50 files per type):
- `const` vs `let` ratio
- Import grouping style
- Function length average
- JSDoc/type annotation coverage
- Naming conventions (camelCase, snake_case, etc.)

**Extract from git history** (last 100 commits):
- Conventional commits usage rate
- Branch naming patterns
- Co-authorship patterns

**Extract from configs:**
- ESLint rules → suggest matching style rules
- Prettier config → formatting preferences
- tsconfig strict settings → type safety rules

Compute confidence score per pattern:
```
confidence = (occurrences / total) × consistency × clarity
```

### Remote source

```bash
TEMP_DIR=$(mktemp -d)
git clone --depth=1 {SOURCE_URL} "$TEMP_DIR/target-repo"
```

If clone fails: report error and exit.

Run the same repo/dir scan against `$TEMP_DIR/target-repo`. Focus on conventions worth adopting rather than project-specific details.

After analysis, clean up: `rm -rf "$TEMP_DIR"`.

---

## Step 2: Score and Group Patterns

Group collected patterns by confidence:

```
ready     (confidence > 0.75, observations ≥ 3) — high confidence, can auto-apply
candidate (confidence 0.5–0.75, observations ≥ 2) — ask user
observing (confidence < 0.5) — keep tracking (session only) or note (code/remote)
```

Generate rule text for each ready/candidate pattern:
```
Pattern: const used 85% of time in TypeScript files
Rule: "Prefer `const` over `let` (use `let` only when reassignment is needed)"
Section: TypeScript Style
Contexts: code, typescript
```

---

## Step 3: Present and Apply

### Auto-apply ready patterns (if AUTO_APPLY or config.autoApply=true)

For each `ready` pattern: add rule to CLAUDE.md in the appropriate section with detected contexts. Mark as `applied` in patterns.json.

Report:
```
✓ Auto-applied 3 rules:
  Build System — "Always use justfile recipes (check `just --list`)"  [0.92]
  TypeScript   — "Prefer const over let"                              [0.88]
  Git Commits  — "Use conventional commit format"                     [0.85]
```

### Present candidates one at a time

For each `candidate` pattern, use **AskUserQuestion**:
```
question: "Found pattern: {description} ({count} observations). Add this rule?"
header: "Learn from Pattern"
multiSelect: false
options:
  - label: "Yes, add rule"
    description: "{generated rule text}"
  - label: "Rephrase it"
    description: "The idea is right but wording is off — let me say it"
  - label: "Not yet"
    description: "Keep observing"
  - label: "Never"
    description: "This is an exception, don't track it"
```

**"Yes"** → add rule to CLAUDE.md, mark `applied`.

**"Rephrase it"** → follow up:
```
question: "How would you phrase this rule?"
header: "Your Rule"
options:
  - label: "Skip for now"
```
Accept free-form text. Store as `confidence: 1.0, status: ready`. Confirm before adding to CLAUDE.md.

**"Never"** → mark `ignored` in patterns.json. Follow up:
```
question: "Got it — ignoring that pattern. Want to capture a different rule instead?"
options:
  - label: "Yes, let me describe it"
  - label: "No, just ignore it"
```
If yes: collect description, add as `source: user-correction` with `confidence: 1.0`. Add to CLAUDE.md after confirmation.

**"Not yet"** → leave as candidate, increment observation threshold by 1.

---

## Step 4: Report and Update State

```
📚 Learning Summary ({source})

Applied: {N} rules
  ✓ Build System — "Use justfile recipes"
  ✓ TypeScript   — "Prefer const over let"

Suggested: {N} rules (confirmed by you)
Skipped:   {N} (not yet / never)

Still observing: {N} patterns
  ◦ Prefer const over let (1 observation, need 2 more)

CLAUDE.md: {before} → {after} tokens
```

Update `.codevoyant/style/patterns.json` with all status changes.

Update `.codevoyant/style.json` learning stats:
```json
{
  "learning": {
    "lastRun": "{timestamp}",
    "lastSource": "{source}",
    "totalPatterns": N,
    "appliedRules": N
  }
}
```
