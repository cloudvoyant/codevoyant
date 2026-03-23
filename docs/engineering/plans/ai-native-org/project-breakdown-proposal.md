# Project Task Breakdown

## norm (standalone repo)

- [ ] Create `cloudvoyant/norm` repo with pnpm + mise + vitest CI
- [ ] Extract `libs/norm` from readership `feature/READ-95-migrations` (runner, schema, Firestore adapter, CLI, tests)
- [ ] Publish `@cloudvoyant/norm` to npm
- [ ] Update readership to import from `@cloudvoyant/norm`

> MongoDB adapter deferred to backlog (outside this initiative). `NormAdapter<TDb>` interface already supports it.

## skill-issues

- [ ] `skills/ts-monorepo/SKILL.md` — pnpm workspaces, vitest, mise, barrel exports
- [ ] `skills/sveltekit/SKILL.md` — Svelte 5 runes, SvelteKit routing, Tailwind 4, SSR/CSR
- [ ] `skills/platform-eng/SKILL.md` — mise tasks, Docker+supervisord, env/secrets
- [ ] Migrate `nv-gcp-template` from justfile to mise (following nv-lib-template → nv-mise-template pattern)
- [ ] `skills/terraform/SKILL.md` — GCP Cloud Run, Firebase, IAM, state, modules
- [ ] `skills/norm/SKILL.md` — schema design, migrations, Firestore+MongoDB, norm.config.ts

## mnemonic

- [ ] SQLite schema: sessions, entries (type, content, embedding, tags, project, timestamp)
- [ ] sqlite-vec integration + cosine search
- [ ] Embedding provider (local gguf or API)
- [ ] CRUD: store, search, recall, forget, list
- [ ] MCP server: mem_store, mem_search, mem_recall, mem_forget, mem_list
- [ ] CLAUDE.md mcpServers entry
- [ ] Update mem:learn / mem:find / mem:list skills to use mnemonic MCP
- [ ] Automatic project context loading on session start
- [ ] Decision history logging
- [ ] Cross-agent shared store support

## openclaw-harness

- [ ] spec-bg + dev-commit work reliably in container
- [ ] Quality gate pipeline (lint → typecheck → test) before commit
- [ ] Structured Slack output (pass/fail, not raw terminal)
- [ ] Gateway API: structured workflow payloads + session ID + webhook
- [ ] Rotate gateway auth token
- [ ] Evaluate custom openclaw agents vs skill invocations — ADR
- [ ] Git worktree isolation per dispatched task
- [ ] Worktree lifecycle management (create/merge/cleanup)

## codevoyant-agent

- [ ] Orchestrator agent SKILL.md: dispatch, track, re-plan on failure
- [ ] State model: agents × { id, task, status, step, tokensBurned }
- [ ] Ink v5 TUI: agent list panel, progress, token cost
- [ ] Session management: list, resume, branch
- [ ] Keyboard controls: focus, pause, redirect, kill
- [ ] Harness integration: dispatch via Gateway API, stream output
- [ ] Quality gate results inline per agent
- [ ] Intervention: pause, redirect, terminate+rollback
- [ ] SSH/remote mode: pure ANSI, session persistence

## astralcloud-poc

- [ ] Spike: SSH + env projection to remote VM
- [ ] Spike: TUI remote integration
- [ ] Spike: cluster-of-machines networking model
- [ ] Output: ADR + H2 2026 architecture proposal
