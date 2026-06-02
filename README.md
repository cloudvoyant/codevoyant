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
<td align="center"><img src="docs/public/icons/dev.svg" width="32"></td>
<td><strong>dev</strong> — architecture and exploration<br>
Architecture planning, technical exploration, and repo/branch comparison.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/em.svg" width="32"></td>
<td><strong>em</strong> <sup>Experimental</sup> — engineering project planning<br>
Milestone-grouped task plans, capacity and dependency review, and sync with Linear.</td>
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

**Skills**

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/pr.svg" width="32"></td>
<td><strong>pr</strong> — AI-powered code review<br>
Generate professional inline review comments from a diff, address change requests, and publish a draft review.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/skill.svg" width="32"></td>
<td><strong>skill</strong> — build, maintain, and report skills<br>
Scaffold new skills, iterate on existing ones, audit quality, and report issues to skill authors.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/tasks.svg" width="32"></td>
<td><strong>tasks</strong> — run project tasks<br>
Detect and run tasks across mise, just, task.dev, and npm scripts with a consistent interface.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/git.svg" width="32"></td>
<td><strong>git</strong> — commits and rebase<br>
Conventional commits with auto-formatting and safe interactive rebase.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/gh.svg" width="32"></td>
<td><strong>gh</strong> — GitHub CI and PR review<br>
Watch Actions pipelines, fetch and post inline PR review comments, and manage draft reviews.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/glab.svg" width="32"></td>
<td><strong>glab</strong> — GitLab CI and MR review<br>
Watch CI pipelines, fetch and post inline MR discussion notes, and manage draft reviews.</td>
</tr>
</table>

**Tools & Frameworks** *(context skills — activate automatically)*

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/docker.svg" width="32"></td>
<td><strong>docker</strong> — multi-stage builds, Compose, cross-platform networking, GCP registry</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/gcp.svg" width="32"></td>
<td><strong>gcp</strong> — Artifact Registry, Cloud Run deploy, gcloud auth, service account patterns</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/mise.svg" width="32"></td>
<td><strong>mise</strong> — mise.toml authoring, task naming conventions, language-specific setup recipes</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/terraform.svg" width="32"></td>
<td><strong>terraform</strong> — directory structure, backend config, workspace-per-environment for GCP and AWS</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/sveltekit.svg" width="32"></td>
<td><strong>sveltekit</strong> — feature-slice architecture, Svelte 5 runes, shadcn-svelte, a11y, form patterns</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/typescript.svg" width="32"></td>
<td><strong>typescript</strong> — unknown catch, library types, Zod generic bounds</td>
</tr>
</table>

## Installation

### Claude Code

```bash
npx skills add cloudvoyant/codevoyant
```

### OpenCode

```bash
curl -fsSL https://raw.githubusercontent.com/cloudvoyant/codevoyant/main/scripts/install-opencode.sh | bash
```

### VS Code Copilot

```bash
curl -fsSL https://raw.githubusercontent.com/cloudvoyant/codevoyant/main/scripts/install-vscode.sh | bash
```

## Quick Start

```bash
# Plan and execute a feature
/spec new my-feature          # explore requirements and create a plan
/spec go my-feature           # execute step-by-step with review stops
/spec bg my-feature           # hand off to a background agent

# Ship code
/git commit                   # format → conventional commit → push
/gh ci --autofix              # watch GitHub Actions, auto-fix failures and re-push
/glab ci --autofix            # watch GitLab CI, auto-fix failures and re-push

# Review a PR/MR
/pr new                       # generate inline review comments from the diff
/pr address                   # pull reviewer feedback and propose fixes

# Plan engineering work
/em plan "migrate auth to OAuth2"    # milestone-grouped task plan
/em review my-plan                   # capacity and risk review

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
