<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/codevoyant-logo-dark.svg">
    <img src="docs/public/codevoyant-logo-light.svg" alt="codevoyant" width="280">
  </picture>

  <p>Plugins and tools for development with AI agents</p>

  <p>
    <a href="https://cloudvoyant.github.io/codevoyant">Docs</a> ·
    <a href="https://cloudvoyant.github.io/codevoyant/installation">Installation</a> ·
    <a href="https://cloudvoyant.github.io/codevoyant/user-guide">User Guide</a>
  </p>
</div>

---

**codevoyant** is a collection of plugins that give AI coding agents structured workflows for planning, development, and style enforcement. Works with Claude Code, OpenCode, and VS Code Copilot.

## Plugins

<table>
<tr>
<td width="48" align="center"><img src="docs/public/icons/spec.svg" width="32"></td>
<td><strong>spec</strong> — plan and execute complex work<br>
Research requirements, generate architecture proposals, produce phase-by-phase implementation plans, and execute them autonomously in the background with <code>--bg</code>.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/dev.svg" width="32"></td>
<td><strong>dev</strong> — commits, CI, and code review<br>
Conventional commits with auto-formatting, background CI monitoring, safe rebasing, PR review comment resolution, and pre-approving agent permissions.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/style.svg" width="32"></td>
<td><strong>style</strong> — evolve and enforce your style guide<br>
Context-aware <code>CLAUDE.md</code> with tagged rule sections that load only when relevant — ~74% fewer tokens than loading everything every interaction.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/em.svg" width="32"></td>
<td><strong>em</strong> <sup>Beta</sup> — engineering roadmaps and epic planning<br>
Multi-epic roadmaps with ASCII architecture diagrams, detailed task breakdowns, capacity and dependency review, and bidirectional sync with Linear, Notion, or GitHub.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/pm.svg" width="32"></td>
<td><strong>pm</strong> <sup>Beta</sup> — product roadmaps and PRDs<br>
Phased product roadmaps with market context, per-feature PRDs with acceptance criteria and metrics, prioritization review, and docs generation for stakeholders.</td>
</tr>
<tr>
<td align="center"><img src="docs/public/icons/utils.svg" width="32"></td>
<td><strong>utils</strong> — shared utility scripts<br>
Cross-platform notification script (macOS, Linux, Windows, WSL) with automatic <code>[project @ branch]</code> context. Infrastructure dependency for em and pm.</td>
</tr>
</table>

## Installation

### Claude Code

```bash
/plugin marketplace add cloudvoyant/codevoyant
/plugin install spec
/plugin install dev
/plugin install style
/plugin install em
/plugin install pm
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
/spec:new my-feature          # explore requirements, generate proposals, create plan
/spec:go my-feature --bg      # hand off to a background agent while you keep working
/spec:list                    # check progress across all active plans

# Ship code
/dev:commit                   # format → conventional commit → push → CI monitor
/dev:ci --autofix             # watch CI, auto-fix failures and re-push

# Maintain your style guide
/style:init                   # detect stack, create context-tagged CLAUDE.md
/style:review                 # check recent work against the guide

# Plan engineering work
/em:plan "Q3 infrastructure roadmap"  # roadmap + architecture diagrams + epic breakdowns
/em:review my-roadmap --bg           # background capacity and risk review
/em:sync my-roadmap --push           # push to Linear/Notion/GitHub

# Plan product work
/pm:plan "mobile onboarding"         # phased roadmap + PRDs per feature
/pm:review my-roadmap                # coverage, prioritization, feasibility check

# Pre-approve agent permissions (stop mid-run prompts)
/dev:allow --plugins spec,dev

# Explore what any plugin can do
/spec:help                    # list all spec commands
/dev:help ci                  # show full details for a specific command
```

See the **[full documentation →](https://cloudvoyant.github.io/codevoyant)**

## License

MIT © Cloudvoyant
