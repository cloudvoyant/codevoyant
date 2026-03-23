# Architecture Research — AI Native Org

## norm (WIP in readership)

**Location:** `readership/.worktrees/feature/READ-95-migrations/libs/norm`

**What exists:**

- `NormAdapter<TDb>` interface — getMigrationRecords, saveMigrationRecord, clearCollection, guardedDb
- `FirestoreAdapter` — full implementation with guarded collection access
- Migration runner — sorted apply order, `_migrations` collection records on success only (migrate-mongo pattern)
- Schema drift detection — hashes `NormConfig.schemas` via Zod, fails fast if schemas changed without migration
- CLI commands: `migrate`, `schema`, `schema validate`, `clear`, `seed`
- `FirestoreAdapter.collections(schemas)` — returns typed `CollectionReference<T>` with Zod converter
- Full test suite (runner, collections, validate, clear)

**Extraction work:**

- Package is `@readership/norm` — rename to `@cloudvoyant/norm`
- Firestore dependency is peer/optional (adapter pattern already isolates it)
- MongoDB adapter: implement same `NormAdapter<MongoClient>` interface; `_migrations` = mongo collection

---

## openclaw-harness (working in core-infra)

**Location:** `core-infra/apps/openclaw`

**Stack:**

- Docker + supervisord
- openclaw 2026.3.13 (pinned)
- ACP backend (`acpx`) — persistent mode, workspace at `/root/.openclaw/workspace`
- claude-code-router on port 8787 — routes Claude Code through OpenRouter (Gemini 2.5 Flash)
- Slack socket-mode via `@slack/bolt` — DM pairing policy
- Gateway API on port 18789 (loopback, token auth)

**Known issues / patches:**

- Slack retry dedup: `@slack/bolt` SocketModeReceiver patched to ack retry_num > 0 immediately (prevents double-processing on slow responses)
- openclaw strips `ANTHROPIC_*` env vars for bundled binary — worked around via custom `acpx-oc` wrapper that sets `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`

**Gaps:**

- No quality gates (lint/typecheck/test) in the harness workflow
- Gateway payload format not yet standardised
- Default gateway token is `changeme`
- No worktree isolation per task

---

## Memory system (current state)

**Current:** `npx @codevoyant/agent-kit mem list|find|learn|index`

- File-based: markdown docs in project knowledge dir
- Indexed by frontmatter tags
- No semantic search — keyword only
- No cross-session persistence of agent decisions

**Desired (mnemonic):**

- SQLite + sqlite-vec (embedded, no server, SSH-compatible)
- Semantic search via vector embeddings
- Decision history: every significant agent choice logged with rationale
- MCP server surface: any coding agent can use it
- `mem:*` skills become MCP tool wrappers

**Key reference:** Mem0 research — persistent memory achieves 26% higher response accuracy vs stateless approaches (arxiv.org/pdf/2504.19413)

---

## TUI language decision

**TypeScript (ink v5) — recommended first**

- React-based terminal rendering
- Used by: Cloudflare Wrangler, Prisma CLI, Vercel CLI
- Fits existing pnpm monorepo + existing skills
- Static component for completed output prevents flicker

> tough on performance.

> TS options: https://rezitui.dev/, https://opentui.com/docs/getting-started/

> Python options: textual

**Zig — deferred unless measured need**

- Superior raw terminal performance
- No existing skill, no team fluency
- Requires `skill: zig` before building
- Trigger: measured ink rendering lag > 100ms with 5+ active agents
