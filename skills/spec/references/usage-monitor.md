# Session-file usage monitor

Operational spec for `/spec new --usage`. It locates the executing agent's session/transcript file,
aggregates token and tool telemetry, and writes `{PLAN_DIR}/ai-usage.md` using
`references/ai-usage-template.md`. Preferred execution is a background subagent; a current-agent
fallback is defined for when a subagent cannot be launched.

This is agent-agnostic: Claude Code is parsed first-class; other agents are discovered best-effort and
degrade to the "telemetry unavailable" template variant rather than failing the plan.

## Inputs (provided by `new.md`)

- `PLAN_DIR` — absolute or repo-relative plan directory.
- `PLAN_NAME`, `BRANCH` — for the report header.
- `USAGE_START_EPOCH` — `date +%s` captured when `--usage` tracking began.
- `CWD` — the working directory `/spec new` is running in (`pwd`).

## Step A — Locate the session file (agent-agnostic)

Try providers in order; stop at the first that yields a readable file.

1. **Claude Code.** Session JSONL lives at
   `~/.claude/projects/{SLUG}/{sessionId}.jsonl`, where `{SLUG}` is `CWD` with every `/` replaced by
   `-` (and a leading `-` retained). The active session is the most recently modified `.jsonl` whose
   lines carry `"cwd":"{CWD}"`.

   Select the most recently modified `.jsonl` whose lines actually carry `"cwd":"{CWD}"` — do
   **not** just grab the newest file. When this monitor runs as a background subagent, the
   subagent's own transcript is typically the newest `.jsonl` in the same project dir; filtering by
   `cwd` (and skipping the running subagent's own session id, when it is known via `$CLAUDE_SESSION_ID`)
   keeps the measurement on the parent planning session.

   ```bash
   SLUG=$(echo "$CWD" | sed 's#/#-#g')
   CC_DIR="$HOME/.claude/projects/$SLUG"
   SESSION_FILE=""
   if [ -d "$CC_DIR" ]; then
     SESSION_FILE=$(ls -t "$CC_DIR"/*.jsonl 2>/dev/null \
       | while read -r f; do
           # skip the subagent's own transcript if we can identify it
           [ -n "$CLAUDE_SESSION_ID" ] && [ "$(basename "$f" .jsonl)" = "$CLAUDE_SESSION_ID" ] && continue
           grep -ql "\"cwd\":\"$CWD\"" "$f" && { echo "$f"; break; }
         done)
   fi
   AGENT_NAME="claude-code"
   ```

2. **Other agents (best-effort).** Check known transcript locations; if any exists and is JSON/JSONL,
   set `SESSION_FILE` and `AGENT_NAME` accordingly. Probe (extend as agents are added):

   `nullglob` makes unmatched patterns expand to nothing (instead of staying literal) and `globstar`
   makes `**` recurse; without them the loop silently no-ops on dead placeholder paths.

   ```bash
   if [ -z "$SESSION_FILE" ]; then
     shopt -s nullglob globstar 2>/dev/null || true
     for cand in \
       "$HOME/.cursor/"*session*.jsonl \
       "$HOME/.config/opencode/"**/*.jsonl \
       "$HOME/.aider"*.jsonl ; do
       [ -e "$cand" ] && { SESSION_FILE="$cand"; AGENT_NAME="other"; break; }
     done
     shopt -u nullglob globstar 2>/dev/null || true
   fi
   ```

3. **None found.** Leave `SESSION_FILE` empty → take the **unavailable path** in Step C.

Derive, when a Claude Code file was found:

```bash
SESSION_ID=$(basename "$SESSION_FILE" .jsonl)
AGENT_VERSION=$(grep -m1 '"version"' "$SESSION_FILE" | jq -r '.version' 2>/dev/null || echo "unknown")
```

## Step B — Aggregate telemetry (Claude Code JSONL)

Each assistant line has `.message.usage` with `input_tokens`, `output_tokens`,
`cache_read_input_tokens`, `cache_creation_input_tokens`, and `server_tool_use.{web_search_requests,
web_fetch_requests}`. Tool invocations appear as `.message.content[] | select(.type=="tool_use") |
.name`.

Bound the aggregation to the **planning window** the header advertises: each line carries an ISO-8601
`.timestamp`; only assistant turns at or after `USAGE_START_EPOCH` belong to this `/spec new` run. On a
long-lived session, summing the whole file would over-count turns from before planning began. Pass the
start epoch into `jq` and filter on it (turns with no parseable timestamp are kept, so a session that
predates timestamped lines still measures rather than silently dropping to zero):

```bash
read -r IN OUT CR CC WS WF <<EOF
$(jq -s --argjson start "${USAGE_START_EPOCH:-0}" '
  [ .[]
    | select(.type=="assistant")
    | select((.timestamp // "" | if . == "" then $start else (fromdateiso8601? // $start) end) >= $start)
    | .message.usage ] as $u
  | [ ([$u[]?.input_tokens // 0]                | add // 0),
      ([$u[]?.output_tokens // 0]               | add // 0),
      ([$u[]?.cache_read_input_tokens // 0]     | add // 0),
      ([$u[]?.cache_creation_input_tokens // 0] | add // 0),
      ([$u[]?.server_tool_use.web_search_requests // 0] | add // 0),
      ([$u[]?.server_tool_use.web_fetch_requests // 0]  | add // 0) ]
  | @tsv' "$SESSION_FILE" 2>/dev/null)
EOF
TOTAL=$(( ${IN:-0} + ${OUT:-0} + ${CR:-0} + ${CC:-0} ))

# Tool-call breakdown (name -> count), and total tool calls — same window bound:
WINDOW_FILTER='select(.type=="assistant")
  | select((.timestamp // "" | if . == "" then '"${USAGE_START_EPOCH:-0}"' else (fromdateiso8601? // '"${USAGE_START_EPOCH:-0}"') end) >= '"${USAGE_START_EPOCH:-0}"')
  | .message.content[]? | select(.type=="tool_use") | .name'
TOOL_TABLE=$(jq -rc "$WINDOW_FILTER" "$SESSION_FILE" 2>/dev/null | sort | uniq -c | awk '{printf "| %s | %s |\n", $2, $1}')
TOOL_TOTAL=$(jq -rc "$WINDOW_FILTER" "$SESSION_FILE" 2>/dev/null | wc -l | tr -d ' ')
```

If `jq` errors or the file is not the expected schema (empty `IN/OUT` and no tool rows), treat as
**unavailable** (Step C, unavailable variant) — do not emit zeros as if measured.

Compute the window:

```bash
END_EPOCH=$(date +%s)
START_ISO=$(date -u -r "$USAGE_START_EPOCH" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")
END_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DUR=$(( END_EPOCH - USAGE_START_EPOCH ))s
```

## Step C — Write `ai-usage.md`

Read `references/ai-usage-template.md`. Substitute the header fields
(`{plan-name}`, `{branch}`, `{agent-name}`, `{agent-version}`, `{session-file-path}`, `{session-id}`,
`{start-iso}`, `{end-iso}`, `{duration}`, `{Captured by}`).

- **Measured path:** fill the Token Usage table (`IN/OUT/CR/CC/TOTAL`), the Tool Calls table
  (`TOOL_TABLE` rows + `TOOL_TOTAL`), and a Notes line mentioning web search/fetch counts
  (`WS`/`WF`) if non-zero.
- **Unavailable path:** use the template's "telemetry-unavailable variant" for the Token Usage /
  Tool Calls sections; still fill whatever `## Session` fields are known.

Write to `{PLAN_DIR}/ai-usage.md`. Verify: `test -s "{PLAN_DIR}/ai-usage.md"`.

## Subagent prompt (preferred)

`new.md` launches this as `subagent_type: general-purpose`, `run_in_background: true`, and stores the
Task id as `USAGE_TASK_ID`. Prompt handed to the subagent:

    You are an AI-usage monitor for a `/spec new` planning run. Do NOT plan or edit any plan files.

    Inputs:
    - PLAN_DIR = {PLAN_DIR}
    - PLAN_NAME = {PLAN_NAME}
    - BRANCH = {BRANCH}
    - CWD = {CWD}
    - USAGE_START_EPOCH = {USAGE_START_EPOCH}

    Follow `~/.claude/skills/spec/references/usage-monitor.md` Steps A–C exactly:
    locate the current agent's session file (agent-agnostic), aggregate token and tool telemetry,
    and write {PLAN_DIR}/ai-usage.md using ~/.claude/skills/spec/references/ai-usage-template.md.
    If no session file can be located or parsed, write the "telemetry unavailable" variant — never
    fail. Print the final path and the total token count when done.

The subagent runs to completion in the background; `new.md` blocks on its `TaskOutput` only at Step 6,
after planning is otherwise finished, so tracking never delays the plan.

## Current-agent fallback

If a subagent cannot be launched (tool unavailable, or `TaskCreate` fails), the planning agent itself
runs Steps A–C at Step 6 — after the plan files are written — and writes `ai-usage.md`. Set
`Captured by = current-agent (fallback)` in the header.
