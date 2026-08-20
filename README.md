<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/codevoyant-logo-dark.svg">
    <img src="docs/public/codevoyant-logo-light.svg" alt="codevoyant" width="280">
  </picture>

  <p>Skills for development with AI coding agents</p>

  <p>
    <a href="https://cloudvoyant.github.io/codevoyant">Docs</a> ·
    <a href="https://cloudvoyant.github.io/codevoyant/installation">Installation</a> ·
    <a href="https://cloudvoyant.github.io/codevoyant/user-guide">User Guide</a>
  </p>
</div>

---

**codevoyant** is a collection of skills (slash commands) that give AI coding agents structured workflows for planning, development, and tooling. Works with Claude Code, OpenCode, and VS Code Copilot.

## Skills

**Workflows**

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/spec.svg" width="32"></td>
<td><strong>spec</strong> — plan and execute complex work<br>
Research requirements, generate proposals, create phase-by-phase implementation plans, and execute them step-by-step or hand off to a background agent.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/explore.svg" width="32"></td>
<td><strong>explore</strong> — pure technical exploration<br>
Research problem spaces, compare technical approaches and repositories, and generate decision-oriented proposals. Never writes application code.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/docs.svg" width="32"></td>
<td><strong>docs</strong> — engineering documentation<br>
Generate, update, review, and retroactively create docs from standard templates.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/flow.svg" width="32"></td>
<td><strong>flow</strong> — end-to-end pipeline orchestration<br>
Chain skill workflows into end-to-end pipelines that run sequentially.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/pr.svg" width="32"></td>
<td><strong>pr</strong> — AI-powered code review<br>
Generate professional inline review comments from a diff, address change requests, and publish a draft review.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/qa.svg" width="32"></td>
<td><strong>qa</strong> — bug investigation and smoke testing<br>
Structured bug investigation, browser-agent smoke tests, one-command issue filing to GitHub, GitLab, or Linear.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/skill.svg" width="32"></td>
<td><strong>skill</strong> — build, maintain, and report skills<br>
Scaffold new skills, iterate on existing ones, audit quality, and report issues to skill authors.</td>
</tr>
</table>

**Domains** *(experimental context skills for specialized engineering)*

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/plan.svg" width="32"></td>
<td><strong>plan</strong> <sup>Experimental</sup> — planning at every level<br>
Plan a single task, a project, an initiative, or a whole product — with milestone-grouped task plans, roadmap review, and Linear sync.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/pm.svg" width="32"></td>
<td><strong>pm</strong> <sup>Experimental</sup> — product roadmaps and PRDs<br>
Phased roadmaps, per-feature PRDs, prioritization review, and Linear initiative sync.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/ux.svg" width="32"></td>
<td><strong>ux</strong> <sup>Experimental</sup> — prototyping and style research<br>
Scaffold SvelteKit prototypes, create single-file wireframe explorations, and extract styles from live sites.</td>
</tr>
</table>

**Tools**

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/changelog.svg" width="32"></td>
<td><strong>changelog</strong> — retcon PR/MR commit messages and preview the next changelog</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/cz.svg" width="32"></td>
<td><strong>cz</strong> — show current and predicted next version using commitizen</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/gh.svg" width="32"></td>
<td><strong>gh</strong> — Watch Actions pipelines, fetch and post inline PR review comments, manage draft reviews</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/git.svg" width="32"></td>
<td><strong>git</strong> — conventional commits with auto-formatting, safe interactive rebase, and branch/worktree setup</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/glab.svg" width="32"></td>
<td><strong>glab</strong> — watch CI pipelines, fetch and post inline MR discussion notes, manage draft reviews</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/helix.svg" width="32"></td>
<td><strong>helix</strong> — Helix editor key bindings for file navigation and selection-based workflows</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/linear.svg" width="32"></td>
<td><strong>linear</strong> — create Linear issues and bug reports via MCP Linear tools</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/mise.svg" width="32"></td>
<td><strong>mise</strong> — mise.toml authoring, task naming conventions, language-specific setup recipes</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/release.svg" width="32"></td>
<td><strong>release</strong> — show current and predicted next version via semantic-release or release-it</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/task.svg" width="32"></td>
<td><strong>task</strong> — detect and run tasks across mise, just, task.dev, and npm scripts</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/vim.svg" width="32"></td>
<td><strong>vim</strong> — Vim and Neovim key bindings for file navigation, search, and splits</td>
</tr>
</table>

## Installation

### Claude Code

```bash
npx skills add cloudvoyant/codevoyant
```

### OpenCode

```bash
npx skills add cloudvoyant/codevoyant
```

OpenCode's `skill` tool takes only a name, so args typed after `/skill` are dropped. Dispatcher skills degrade gracefully: with no parseable verb they ask the user what they want (numbered list on non-Claude-Code platforms) instead of silently running help. See `docs/installation.md`.

### VS Code Copilot

```bash
curl -fsSL https://raw.githubusercontent.com/cloudvoyant/codevoyant/main/scripts/install-vscode.sh | bash
```

## Quick Start

```bash
# Plan and execute a feature
/spec new my-feature          # explore requirements and create a plan (add --branch / --worktree to isolate work)
/spec go my-feature           # execute step-by-step with review stops
/spec bg my-feature           # hand off to a background agent

# Ship code
/git worktree --branch --worktree  # set up a branch and/or worktree (independent)
/git commit                   # format → conventional commit → push
/gh ci --autofix              # watch GitHub Actions, auto-fix failures and re-push
/glab ci --autofix            # watch GitLab CI, auto-fix failures and re-push

# Review a PR/MR
/pr new                       # generate inline review comments from the diff
/pr address                   # pull reviewer feedback and propose fixes

# Plan engineering work
/plan plan "migrate auth to OAuth2"    # milestone-grouped task plan
/plan review my-plan                   # capacity and risk review

# Plan product work
/pm plan quarter                     # draft quarterly roadmap
/pm prd "user authentication"        # standalone PRD

# Build a skill
/skill new my-command                # scaffold from template
/skill critique my-command           # audit quality before shipping
/skill feedback spec                 # report an issue to skill authors
```

See the **[full documentation →](https://cloudvoyant.github.io/codevoyant)**

## License

MIT © Cloudvoyant
