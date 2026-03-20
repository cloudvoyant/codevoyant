---
description: "Use when the user asks about available ux commands or needs help choosing a skill. Triggers on: \"ux help\", \"help ux\", \"what can ux do\", \"ux commands\", \"list ux skills\", \"ux reference\". Lists all ux commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

ux — UX prototyping commands for Claude Code

  /ux:prototype  [prototype-name] [--bg] [--silent]
      Scaffold a SvelteKit + Tailwind + shadcn-svelte prototype with feature-slice architecture.
      Supports in-repo (single package or monorepo) and out-of-repo (.codevoyant/[project]/prototypes/).
      Hard-coded data, fake auth, professional styling.

  /ux:explore  [exploration-name] [--slideshow] [--bg] [--silent]
      Create a single HTML file wireframe or approach comparison.
      Tailwind via CDN. No build step. Wireframe aesthetic.
      --slideshow: multiple labeled sections comparing approaches side-by-side.

  /ux:style-synthesize  <url> [--name name] [--bg] [--silent]
      Visit a live URL, screenshot across breakpoints, and synthesize its visual style.
      Outputs style-report.md + theme.css to docs/ux/style-research/[source]/.

  /ux:help  [skill-name]
      List all ux commands.
