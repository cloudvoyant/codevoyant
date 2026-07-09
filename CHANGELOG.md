## [1.56.0](https://github.com/cloudvoyant/codevoyant/compare/v1.55.0...v1.56.0) (2026-07-09)

### Features

* **flow:** global storage, list command, and dynamic parameters

- --global stores flows under ~/.codevoyant/flows, reusable across
  projects; list enumerates local + global flows (fixes the old
  list->status alias)
- dynamic {{parameters}}: bare text binds to {{input}}, --set for named
  params, prompt for anything unset; step outputs thread forward as flow
  context, persisted so an interrupted flow resumes with it
- chain interactive skills safely: steps run non-interactively and, when
  a step can't resolve a decision, escalate one NEEDS_INPUT question to
  the user and re-run; authoring guidance for per-step inputs and
  producer -> consumer artifact handoff

* **pr:** review evaluates changes against stated intent

Reviews judge whether a change delivers its stated purpose, not just
whether the code is clean. Add an INTENT ALIGNMENT dimension, checked
first: read the PR/MR title and description as the intent, trace the
headline use case end-to-end, and flag anything that undercuts it as
BLOCKING even when the code is well-formed. The summary leads with an
intent verdict.

## [1.55.0](https://github.com/cloudvoyant/codevoyant/compare/v1.54.0...v1.55.0) (2026-07-08)

### Features

* **skills:** sharpen spec, git, ed, vim, and pr workflows

Cross-skill quality pass. Highlights by skill:

spec:
- code-first gate — every implementation task carries the complete,
  literal code before it's written; no prose-only tasks
- /spec go runs independent phases in parallel on a fast model,
  escalating only on genuine trouble
- /spec new accepts an inline objective OR a bare name; a bare name
  scaffolds .codevoyant/plans/{name}/intent.md to fill in (opened in the
  editor when possible), then plans on re-run

git:
- commits never carry agent self-attribution; a commit-msg hook strips
  it from any commit, installable via /git hooks
- new commit --fix loops until CI is green (bounded retries)

ed:
- shared pedagogy guide (Feynman, progressive disclosure, ASCII/mermaid
  diagrams, links); resources mined for examples
- syllabi organized by self-paced modules, not weeks; guides fan out one
  per module

## [1.54.0](https://github.com/cloudvoyant/codevoyant/compare/v1.53.0...v1.54.0) (2026-06-28)

### Features

* **skills:** improve spec/vim/ed, add skill-read perms, drop helix

- spec: delta-free plans (research at plan time only) + always show code
- spec: drop closing /spec new review question
- vim: motions & fundamentals section + compact navigation hints
- ed: artifacts under .codevoyant + --dir, plan to syllabus, per-entry fan-out
- ed assist: haiku/sonnet/opus tiering + hint/show-answer/verify/next
- perms: skill-reference Read globs in allow flows + spec new analysis
- remove helix skill, docs page, icon, sidebar/index entries

## [1.53.0](https://github.com/cloudvoyant/codevoyant/compare/v1.52.0...v1.53.0) (2026-06-13)

### Features

* **ed:** add ed educational skill with new/update/quiz/assist + site wiring

## [1.52.0](https://github.com/cloudvoyant/codevoyant/compare/v1.51.0...v1.52.0) (2026-06-09)

### Features

* **docs:** add docs skill with new/update/review/retcon + site wiring

- add skills/dev-docs/ (template library) and skills/docs/ (operational skill
  with new/update/review/retcon commands extracted from dev-docs)
- add monochrome docs icon, VitePress tile and sidebar entry in correct order
  (spec → dev → docs → flow → pr); update README workflow table
- parallelize docs new/retcon/review and usage report with background agents
- parallelize diff.md steps 3–4 (repo structure scan + category diffs)
- fix spec new: replace dead-end "Needs changes" button with Other free-text
- add xargs, sed, sort, pnpm run docs:build to allowed commands

## [1.51.0](https://github.com/cloudvoyant/codevoyant/compare/v1.50.5...v1.51.0) (2026-06-09)

### Features

* **usage:** add usage skill for responsible-AI attribution reports

- SKILL.md dispatcher with report/generate/run/help verbs
- references/methodology.md, report-template.md, attribution-rules.md
- references/workflows/report.md — 7-step analysis + generation workflow
- references/workflows/help.md — command reference
- docs/skills/usage.md + usage.svg icon
- sidebar entry and index tile; aws hidden from nav
- spec go/guide/update/new patched with --usage gated integrations
- pr open patched with passive attribution footer (Step 3.5)


### Documentation

* **spec:** add --usage flag examples, split command, and clean --usage docs

- Document --usage flag for new/go/guide/update with example sessions
- Add split workflow section (was missing)
- Fix clean description (no longer archives to docs/plan/)
- Add --usage export-and-clear behaviour for spec clean
- Add Usage tracking section with feature branch and mainline examples

## [1.50.5](https://github.com/cloudvoyant/codevoyant/compare/v1.50.4...v1.50.5) (2026-06-09)

### Bug Fixes

* **docs:** alphabetise tools sidebar and index tiles; replace vim icon

- Move helix after glab in config.mjs sidebar and index.md features
- Add missing tools to README (changelog, cz, helix, release, vim)
- Replace vim.svg with downloaded icon, recoloured to brand purple

## [1.50.4](https://github.com/cloudvoyant/codevoyant/compare/v1.50.3...v1.50.4) (2026-06-09)

### Bug Fixes

* **icons:** restore VIM letter cutouts in monochrome vim icon

- switch to mask-on-`<g>` approach: all diamond paths inside masked group
- mask includes V, I, and M letter paths as black cutouts
- previous fix used separate `<path>` elements with fill-rule="evenodd"
  which only creates holes within a single path, not across elements

## [1.50.3](https://github.com/cloudvoyant/codevoyant/compare/v1.50.2...v1.50.3) (2026-06-09)

### Bug Fixes

* **icons:** remove broken rdf/cc metadata from vim.svg (undeclared namespaces)

## [1.50.2](https://github.com/cloudvoyant/codevoyant/compare/v1.50.1...v1.50.2) (2026-06-09)

### Bug Fixes

* **icons:** square helix viewBox, remove explicit w/h from both SVGs

## [1.50.1](https://github.com/cloudvoyant/codevoyant/compare/v1.50.0...v1.50.1) (2026-06-09)

### Bug Fixes

* **vim-helix:** use official SVGs monochrome, free-text queries, richer docs

icons:

- vim: official vimlogo.svg from vim.org; green/black → #5555ff,
  white/silver/grey paths removed; clean monochrome diamond
- helix: official logo from helix-editor.com; all colours → #5555ff

skills:
- /vim and /helix now accept a free-text query instead of fixed
  context flags (files|search|splits|buffers|all); keyword matching
  returns the relevant table

docs:
- Both pages add source links (vim.org, helix-editor.com/keymap.html)
- Concrete before/after examples showing how the skill responds
- Guide integration section explains hint-type inference

## [1.50.0](https://github.com/cloudvoyant/codevoyant/compare/v1.49.1...v1.50.0) (2026-06-09)

### Features

* **spec:** add polish command to strip AI verbosity from execution outputs

- Add spec polish workflow: reads execution-log.md to find modified
  files, runs parallel cleanup agents per file applying a strict ruleset
  (remove comments restating code, rhetorical flair, preamble, hedge
  phrases) — never touches logic, config, or plan artifacts
- Add 'p' alias to spec dispatcher
- Document polish in docs/skills/spec.md
- Verify docs/skills/changelog.md, cz.md, release.md — all already clean

* add vim and helix skills, guide editor hints

- /vim and /helix reference skills: 8-key spec workflow quick-ref plus
  5 contexts each (files, search, splits, buffers, all); helix includes
  selection-first framing and full % → s → c search-replace chain
- spec guide --vim / --helix flags: injects 3-4 editor key bindings at
  each task step, keyed to detected task type (files/search/splits/buffers);
  both flags can be combined for side-by-side hints
- Monochrome SVG icons: vim diamond+V, helix hx letterform
- VitePress: index tiles, sidebar entries, docs pages for both skills,
  guide section updated with flag docs


### Bug Fixes

* **release:** convert sanitize-changelog.js to ESM (package.json type=module)

* **release:** sanitize bare HTML tags in CHANGELOG.md after each release

scripts/sanitize-changelog.js wraps `<word>` patterns in backticks so the
Vue template compiler doesn't choke on them in the docs build. Runs in
prepareCmd after @semantic-release/changelog writes CHANGELOG.md and
before @semantic-release/git commits it.

## [1.49.1](https://github.com/cloudvoyant/codevoyant/compare/v1.49.0...v1.49.1) (2026-06-05)

### Bug Fixes

* **docs:** escape bare tags in 1.49.0 changelog entry

## [1.49.0](https://github.com/cloudvoyant/codevoyant/compare/v1.48.1...v1.49.0) (2026-06-05)

### Features

* add changelog/cz/release skills, spec perf improvements, decision log

spec skill:
- spec new skips validation loop by default; opt in with --validate
- spec-executor tracks [DEVIATION] entries in execution-log.md and
  appends ## Deviations to implementation/phase-N.md
- spec go prints Notable deviations summary after all phases
- spec-executor encouraged to use parallel Bash/Edit for independent tasks
- plan-template gains ## Decision Log (User Decisions / Agent Decisions)
- new.md populates Decision Log during planning; executor logs decisions
  during execution (step 3b in progress tracking)

changelog skill (new):
- retcon: propose and apply conventional commit message edits on open
  PR/MR via git rebase -i + git push --force-with-lease
- preview: inline changelog and next-version prediction, no files
- help: command reference

cz skill (new): commitizen version introspection (current + next version)
release skill (new): semantic-release/release-it version introspection

gh/glab extensions:
- retcon subcommand added to both (rc alias, platform-specific PR/MR detection)

docs:
- changelog, cz, release tiles in index.md with single-tone SVG icons
- docs/skills/ pages for all three new skills
- sidebar entries and user-guide section
- retcon documented in gh.md and glab.md

## [1.48.1](https://github.com/cloudvoyant/codevoyant/compare/v1.48.0...v1.48.1) (2026-06-03)

### Bug Fixes

* **docs:** escape bare HTML tags in changelog, shorten index tile descriptions

- Escape `<domain>` and `<tag>` in CHANGELOG.md 1.47.0 entry that were
  breaking the Vue template compiler in the docs build
- Shorten all home page tile descriptions to punchy single-clause lines
- Add wire-formats recipe and NanoVDB/Arrow/3D Tiles refs to compgeo docs page

## [1.48.0](https://github.com/cloudvoyant/codevoyant/compare/v1.47.0...v1.48.0) (2026-06-03)

### Features

* **compgeo:** add NanoVDB GPU voxels, large-scale storage, and wire formats

- Add NanoVDB sections to voxels-and-point-clouds.md and voxel-operations.md
  covering OpenVDB→NanoVDB→CUDA pipeline, GPU-side SDF raymarching and
  containment queries, and pynanovdb Python bindings
- Expand storage-and-compression.md with Zarr chunked voxels, OME-Zarr
  multiscale pyramids, NanoVDB page-streaming, 3D Tiles for massive meshes,
  Apache Arrow/Feather for point cloud attributes, and a format decision table
- Add wire-formats-realtime.md recipe covering FlatBuffers zero-copy vertex
  streaming, binary delta encoding, WebSocket binary framing with backpressure,
  compact 48-byte transform protocol, and gRPC geometry pipelines
- Update SKILL.md with new recipe link and references
- Shorten home page tile subtitles to single sentences


### Documentation

* **readme:** add Domains section with compgeo, hpc, mle, llm

* **readme:** reorganize skills to match sidebar — Workflows, Domains, Tools, Frameworks, Languages

## [1.47.0](https://github.com/cloudvoyant/codevoyant/compare/v1.46.0...v1.47.0) (2026-06-03)

### Features

* **domains:** finalize llm skill — eval recipe, icon, SKILL.md

Phase 6 completion: llm-eval, rag-oss final content, llm.svg icon


### Bug Fixes

* **docs:** escape `<domain>` in changelog, wrap include in v-pre

CHANGELOG.md had a bare `<domain>` tag in prose that Vue's template
compiler treated as an unclosed component, breaking the docs build.
- escape the specific instance in CHANGELOG.md
- wrap the @include in v-pre so future auto-generated entries with
  `<tag>` patterns don't break the build

## [1.46.0](https://github.com/cloudvoyant/codevoyant/compare/v1.45.0...v1.46.0) (2026-06-03)

### Features

* **domains:** add compgeo, hpc, mle, and llm experimental skills

- compgeo: 13 recipes — 3D formats, bbox, voxels, feature extraction
  (CGAL Jet_fitting_3 + Shape_detection), ray tracing, GLTF, SDFs,
  rotations/quaternions, OpenVDB boolean/CSG ops
- hpc: 13 recipes — C++ threading, OpenMP, TBB, SIMD, CUDA, SYCL,
  MPI, Python parallelism, Ray, Thrust, Kokkos, Warp GPU
- mle: 12 recipes — data pipelines, training, MLflow, TensorBoard,
  model publishing, data curation, Label Studio, DVC, data loaders
- llm: scaffold + agent/doc/serving/RAG recipes (eval phase in progress)
- rename "Skills & Workflows" → "Workflows" in sidebar
- fix home page tile order to match sidebar; refresh AWS icon
- remove disable-model-invocation from spec, em, pm, ux, skill, dev

## [1.45.0](https://github.com/cloudvoyant/codevoyant/compare/v1.44.0...v1.45.0) (2026-06-03)

### Features

* **nav:** sidebar restructure — Skills & Workflows + Domains section

- Rename Workflows → Skills & Workflows; merge pr/qa/skill in
- Add Domains section: em, pm, ux, compgeo, hpc, mle (all experimental)
- Move task to Tools section
- Add Domains description to user-guide.md

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;


### Documentation

* **sveltekit:** add monorepo apps/libs overview to feature-architecture page

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* align apps/libs dir structure and DAG feature rules across React, SvelteKit, TanStack

Consistent architecture across all three framework skills:
- Primary monorepo layout: apps/ + libs/feature-* packages
- Within-app: thin routes, hooks, validators, mappers, db, generated/
- Feature libs: components, hooks, view-models, validators, types, server/
- Co-location discouraged except for private types/mappers within a route
- Cross-cutting concerns (logger, etc.) are own libs, not shared utils
- Feature import rule updated from hard isolation to DAG:
  pervasive features (auth, user-profile) importable from other features
  (public API only), all other cross-feature imports blocked
- Three cross-feature coordination mechanisms: shared stores, cache key
  sync, route/widget composition
- Namespacing note: start flat libs/feature-*, namespace under
  libs/&lt;domain&gt;/feature-* when needed

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* move TanStack Project Conventions to second position in sidebar

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* split cpp code-standards and ts pnpm recipes; reorder sidebars

C++:
- Split code-standards.md into code-standards.md (naming, modern C++,
  forbidden patterns) and formatting-and-analysis.md (clang-format,
  clang-tidy, CMake targets, pre-commit, CI gate)
- Reorder: code-standards + formatting-and-analysis now precede
  conan dependency management in sidebar and index

Python:
- Move Project Conventions and Architecture to second position
  (after uv project setup) in sidebar and index

TypeScript:
- Split pnpm-workspace.md into pnpm-workspace.md (workspace setup,
  internal libs, workspace:*) and pnpm-catalog.md (catalogs, named
  catalogs, onlyBuiltDependencies, minimumReleaseAge, catalogMode)
- Add pnpm-catalog entry to sidebar and index

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* update sidebar with descriptive recipe titles and tutorial ordering

- Replace all terse sidebar labels (e.g. "Zustand", "Project setup") with
  full descriptive titles matching new junior-dev recipe rewrites
- Reorder recipe groups to follow progressive tutorial flow (foundation →
  building blocks → data → forms → auth → advanced → conventions)
- Add new conventions recipe entries for react, tanstack, and typescript
- Reorder C++ recipes: cmake → conan-packages → conan-profiles → conan-publishing
  → monorepo → grpc → ci-caching → code-standards
- Include all accumulated skill, recipe, and docs changes from this session

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

## [1.44.0](https://github.com/cloudvoyant/codevoyant/compare/v1.43.0...v1.44.0) (2026-06-02)

### Features

* **skills:** add gh, glab, pr skills; extract ci and pr workflows from git and dev

- add gh skill: GitHub CI monitoring and PR review primitives
- add glab skill: GitLab CI monitoring and MR review primitives
- add pr skill: AI-powered code review (new, address, complete)
- add skill learn and consolidate workflows
- remove git ci, dev pr, dev pr-fix (superseded by above)
- update docs: gh, glab, pr pages; sidebar, index tiles, user guide
- replace skill/pr/gh/glab icons with official SVGs
- update README: correct icons, add missing skills, fix quick start


### Documentation

* monochrome icons, lowercase page titles, remove doc page icons

- Restyle workflow icons (spec, dev, em, pm, ux, utils) to monochrome
- Rebuild spec and em icons from reference designs with mask cutouts
- Lowercase all doc page h1 titles to match sidebar
- Remove icon img tags and script setup blocks from skill doc pages

* title case headings, restructure user guide by skill category

* update user-guide section headings and table formatting

## [1.43.0](https://github.com/cloudvoyant/codevoyant/compare/v1.42.1...v1.43.0) (2026-06-01)

### Features

* **docs:** skill overhaul — new tool skills, docs, icons, and user guide rewrite

- Add docker, gcp, mise, terraform, sveltekit, typescript, tasks skills with full recipe sets
- Add brand SVG icons for all tool/framework/language skills
- Rewrite user guide: remove Mem, add all new skills, move context skills last, fix HRs
- Expand sidebar with Tools / Frameworks / Languages sections; alphabetize tools
- Add /skill feedback verb with GitHub/GitLab issue creation and --save fallback
- Update index page: add all 13 skills, match sidebar order, swap hero button to User Guide
- Separate terraform skill from gcp; move mise task wrappers into mise skill
- Remove shared/references/research-standards.md; per-skill copies in place


### Bug Fixes

* **ci:** allow esbuild build scripts via pnpm.onlyBuiltDependencies

* **ci:** move onlyBuiltDependencies to pnpm-workspace.yaml

* **ci:** pin pnpm to v10 and set onlyBuiltDependencies for esbuild

* **ci:** restore test:agent-kit task in mise.toml

* **ci:** strip agent-kit and npm publish from semantic-release config

- Remove @semantic-release/npm plugin
- Remove @semantic-release/exec prepareCmd that referenced deleted packages
- Simplify prepareCmd to just write version.txt
- Remove packages/agent-kit/package.json from git assets


### Documentation

* **readme:** update for skill overhaul — new skills, tools, and command syntax

## [1.42.1](https://github.com/cloudvoyant/codevoyant/compare/v1.42.0...v1.42.1) (2026-04-13)

### Bug Fixes

* **docs:** remove dead link to deleted skill plugin page


### Code Refactoring

* move workflows into references/, overhaul dev explore, clean up docs and e2e

- Move workflows/ → references/workflows/ for all 7 skills; update all SKILL.md dispatchers
- Rewrite dev:explore: parallel topic-specific research agents, proposal gate before research, auto-generate all proposals, comparison summary doc
- Simplify spec:new Step 3: present past explorations as options instead of yes/no + free-text
- Remove skill lookup (agentskill.sh) from dev:explore and researcher.md
- Remove skill plugin from docs home page and sidebar; update tagline; git skill last
- Delete stale e2e test suite and remove from workspace, mise.toml, package.json

## [1.42.0](https://github.com/cloudvoyant/codevoyant/compare/v1.41.0...v1.42.0) (2026-03-27)

### Features

* **spec:** add guide workflow, enforce plan-only in new

## [1.41.0](https://github.com/cloudvoyant/codevoyant/compare/v1.40.0...v1.41.0) (2026-03-27)

### Features

* **spec:** consolidate workflows into clean and go

- Add clean workflow: combines stop/done/delete into session wrap-up
  (stop agents, archive to docs, triage active plans)
- Replace bg + interactive go with single background-only go workflow
- Remove list, rename, doctor, done, stop, delete, bg workflows
- Alias all removed verbs to their replacements in dispatcher
- Update help, SKILL.md frontmatter, and public docs accordingly

## [1.40.0](https://github.com/cloudvoyant/codevoyant/compare/v1.39.0...v1.40.0) (2026-03-25)

### Features

* **dev:** add mr workflow and update docs for unified skill syntax

- add /dev mr workflow (create PR/MR on GitHub or GitLab)
- update all docs to space-separated command syntax (/em plan vs /em:plan)
- add git skill page, remove mem from sidebar, update architecture.md


### Bug Fixes

* **agent-kit:** remove unused readWorktrees import


### Code Refactoring

* **skills:** consolidate per-skill dirs into unified category packages

* **dev:** rename mr workflow to pr

## [1.39.0](https://github.com/cloudvoyant/codevoyant/compare/v1.38.0...v1.39.0) (2026-03-24)

### Features

* **skill:** add unified skill dispatcher package

- consolidate skill-explore, skill-new, skill-update, skill-critique
  into a single skills/skill/ dispatcher
- dispatcher parses verb, normalises aliases (create->new,
  improve->update, review->critique), falls back to help on unknown verb
- heavy planning work delegated to Opus subagents (skill-planner,
  skill-updater); coordination steps run on lighter model
- skill-researcher (Sonnet) shared across new and update workflows
- context: fork on explore replaced by dispatcher's
  disable-model-invocation: true isolation

## [1.38.0](https://github.com/cloudvoyant/codevoyant/compare/v1.37.0...v1.38.0) (2026-03-24)

### Features

* **spec:** add unified spec skill dispatcher

- consolidates 14 spec-* skills into a single skills/spec/ package
- top-level SKILL.md parses subcommand verb and dispatches to workflows/{verb}.md
- workflow files contain execution logic only — no frontmatter or arg parsing
- agents (spec-executor, spec-updater, spec-planner) each include a printed
  workflow checklist tracked in real-time during execution
- all reference templates consolidated under references/
- all CLI ops use npx @codevoyant/agent-kit — no scripts/ dependencies

## [1.37.0](https://github.com/cloudvoyant/codevoyant/compare/v1.36.0...v1.37.0) (2026-03-23)

### Features

* **pm-approve:** add dual-source research artifact copy

- Copy from both .codevoyant/explore/{SLUG}/ and .codevoyant/plans/{SLUG}/research/
- Mirrors em-approve's existing dual-source pattern
- Ensure COMMIT_DIR exists before copying roadmap file

* **em-plan:** add Scope Decisions and Risks sections to plan template


### Bug Fixes

* **pm-explore:** correct agent output paths from research/ to explore/{SLUG}/research/

All five researcher agents were writing to .codevoyant/research/{SLUG}/
instead of .codevoyant/explore/{SLUG}/research/ as declared in SKILL.md,
causing pm:plan to fail to find the artifacts.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **pm-plan:** replace hardcoded roadmap-backfill with {SLUG} in research paths

Step 1.5 agent prompts were writing research artifacts to a hardcoded
`.codevoyant/explore/roadmap-backfill/` directory instead of the dynamic
per-plan slug path. Replace all three occurrences with `{SLUG}` so each
plan's backfill research lands in the correct explore directory.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **docs:** replace stale .codevoyant/research links in half-year roadmap

All 9 links pointing to .codevoyant/research/ paths now point to the
actual research files that live alongside the roadmap in
docs/product/roadmaps/260322-half/.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;


### Documentation

* **claude:** expand CLAUDE.md with project structure and key conventions

* **pm:** fix pm:explore artifact path in skill reference

Replace stale .codevoyant/research/{slug}.md with correct path
.codevoyant/explore/{slug}/summary.md

* **em:** fix stale approve --push description in public skill doc

The approve section incorrectly stated that --push creates issues directly
under the project with no milestones. Corrected to reflect actual behavior:
creates milestones from plan headings, copies research artifacts, and defers
issue creation to dev:plan.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

## [1.36.0](https://github.com/cloudvoyant/codevoyant/compare/v1.35.3...v1.36.0) (2026-03-23)

### Features

* **em-approve:** add milestone sync, explore artifact copy, initiative mode

- copy .codevoyant/explore/{slug}/ and plans/{slug}/research/ flat into docs/engineering/plans/{slug}/research/
- linear-push-agent: create milestones from plan.md headings (M1/Phase/Milestone patterns)
- linear-push-agent: detect initiative vs single-project plan; route to Initiative Flow for multi-project plans
- linear-push-agent: remove issue creation (issues are dev-plan's responsibility)
- Initiative Flow: create/update each sub-project + milestones in parallel, link to Linear initiative

* **em-plan:** explicit dates, scope reconciliation, parallel estimation

- Step 2.6: replace size buckets with freeform start/end date + constraints; derive available engineer-days immediately
- Step 3.6 (new): mandatory scope coverage reconciliation when source is roadmap/initiative; every OUT item requires a reason (capacity/dependency/technical/timeline/deferred)
- Step 5.5 (new): parallel milestone estimation agents before Gantt; estimates grounded dates; surfaces over-capacity at >80% utilisation
- Research output moved to .codevoyant/explore/{slug}/architecture-research.md (flat); project-breakdown-proposal.md also written to explore dir


### Documentation

* add committed engineering plan and roadmap research artifacts

- docs/engineering/plans/ai-native-org/: plan.md, tasks/projects.md, research/architecture.md
- docs/product/roadmaps/260322-half/: roadmap + 15 pm:explore research/proposals files (plugin-consolidation, portable-agent-plugins, skill-quality)

* remove old flat PRD files and superseded roadmap path

- remove docs/prd/260321-*.md (11 files) — superseded by new .codevoyant/prds/ draft structure
- remove docs/product/roadmaps/260322-half-roadmap.md — moved to docs/product/roadmaps/260322-half/

## [1.35.3](https://github.com/cloudvoyant/codevoyant/compare/v1.35.2...v1.35.3) (2026-03-23)

### Bug Fixes

* **pm-approve:** dated folder, research copy, browser-first Linear sync, PRD routing

- Promote to docs/product/{date}-{timescale}/ (was docs/product/roadmaps/)
- Copy research artifacts from .codevoyant/explore/{slug}/ alongside roadmap
- Add plans update-status --status Approved
- Replace linear-sync-agent with inline browser+MCP loop for initiative docs
  - browser creates blank doc linked to initiative, extract slug from tab URL,
    immediately MCP update_document before navigation
  - strip local markdown links from content before upload
- Add artifact type detection in Step 0 (roadmap vs PRD)
- Add PRD promote flow: .codevoyant/prds/{slug}/{slug}.md -> docs/prd/{slug}/
- initiatives only; never create Linear projects

* **pm-prd:** draft-first flow, fix explore paths, plans register, Mermaid rule

- Draft writes to .codevoyant/prds/{SLUG}/{SLUG}.md (was docs/product/prds/)
- Fix all .codevoyant/research/ paths to .codevoyant/explore/{SLUG}/
- Add plans register --plugin pm call in Step 5
- Update notify/report messages to direct user to run /pm:approve
- Add Mermaid Critical Rule (no ASCII art)
- prd-template: path header updated; Requirements aligned to P0/P1/P2 format

* **em-review:** fix stale plan path, show review inline

- Replace .codevoyant/em/plans/ with .codevoyant/plans/ throughout
- Step 4: output review inline instead of writing {PLAN_DIR}/review.md
- Update Step 5 notify message (no review.md reference)

* **pm-explore:** output to .codevoyant/explore/{slug}/, add Mermaid rule

- Change OUTPUT_PATH from .codevoyant/research/{SLUG}.md to
  .codevoyant/explore/{SLUG}/summary.md
- Change SUB_DIR to .codevoyant/explore/{SLUG}/research/
- Update mkdir, synthesis read, and notify/report paths
- Add Critical Rule: prefer Mermaid, never ASCII art

* **pm-plan:** pre-scan explore dir, fix backfill paths, add plans register

- Pre-scan .codevoyant/explore/ before research question; inject dirs into option label
- Backfill agent outputs moved to .codevoyant/explore/roadmap-backfill/research/
- Add Step 6 plans register call (--plugin pm --total 0)
- em-plan Step 3.5: scan .codevoyant/explore/ instead of .codevoyant/research/
- pm-planner: add Mermaid guidance (Gantt for timeline, flowchart for deps, no ASCII)

* **dev-plan:** replace ASCII System Boundaries diagram with Mermaid flowchart

* **pm-review:** show findings inline, remove review.md file write

## [1.35.2](https://github.com/cloudvoyant/codevoyant/compare/v1.35.1...v1.35.2) (2026-03-22)

### Bug Fixes

* **pm-plan:** remove blocking scope confirmation step

- Step 2 no longer asks AskUserQuestion before drafting
- Skill now auto-proceeds to pm-planner agent after showing scope summary
- Eliminates fork execution breakage where skill terminated at Step 2

## [1.35.1](https://github.com/cloudvoyant/codevoyant/compare/v1.35.0...v1.35.1) (2026-03-22)

### Bug Fixes

* **pm-explore:** replace generic researcher with per-dimension agents

- rewrite Step 2 with explicit Agent call blocks and mkdir -p
- add internal-, ideation-, market-, competitive-, user-problems-researcher agents
- each agent writes to its own isolated sub-artifact in research/{SLUG}/
- move research standards to references/web-research-standards.md
- remove generic pm-researcher.md (superseded)
- trim SKILL.md from 229 to 167 lines

## [1.35.0](https://github.com/cloudvoyant/codevoyant/compare/v1.34.0...v1.35.0) (2026-03-22)

### Features

* **docs:** add skill.svg icon for skill plugin


### Documentation

* add skill plugin to user guide, home page, and sidebar

- user-guide: add Skill section after UX, move Mem to bottom; update EM
  and PM sections for draft-first workflow; fix plugin title casing
- index.md: add Skill card before Mem
- config.mjs: add Skill to sidebar after UX, before Mem

## [1.34.0](https://github.com/cloudvoyant/codevoyant/compare/v1.33.4...v1.34.0) (2026-03-22)

### Features

* **pm:** add pm-approve --push, pm-explore; overhaul pm skills

- pm-approve: new skill with --push [initiative-url] flag; copies roadmap
  to Linear initiative description, research artifacts become documents
- pm-explore: new research skill depositing to .codevoyant/research/
- pm-help: updated to reflect pm-approve and pm-explore
- pm-plan/prd/review/update: research quality improvements, new templates
  and agents, capability tier guide reference

* **skill:** add skill-explore, skill-new, skill-update; remove skill-critique

- skill-explore, skill-new, skill-update: new skill workflow tools
- skill-critique: removed (merged into skill-review --effectiveness)

* **dev:** draft-first dev-plan with --mode flag, add dev-approve skill

- dev-plan: output to .codevoyant/plans/ instead of docs/architecture/
- dev-plan: add --mode arch|feat; arch mode adds task breakdown with LOE,
  blocking relationships, architecture ref, and verifiable ACs per task
- dev-plan: register plan with agent-kit on completion
- dev-approve: new skill — promotes to docs/architecture/, optional --push
  [linear-url] creates tasks seeded for autonomous spec:new/spec:bg

* **em:** draft-first em-plan, add em-approve with --push flag

- em-plan: strip inline Linear push (Step 6 option + Step 7)
- em-plan: new Critical Principles — value-first, product/engineering balance
- em-plan: remove --push re-push shortcut; add --silent flag
- em-approve: rename --linear to --push, parse optional project URL
- em-approve: rewrite linear-push-agent — no milestones, start/end dates, git repo linked

* **spec:** simplify spec-new, remove unused agents and references

- spec-new: restructured and simplified; remove spec-explorer agent,
  migration.md, proposal-template.md, check-worktree.sh
- spec-new: spec-planner agent updated
- spec-go/bg/list/refresh/review/update: quality improvements


### Documentation

* update public site for em, dev, pm, skill plugins

- em.md, dev.md, pm.md: reflect draft-first workflow, document approve
  skills and --push flag, add pm-explore workflow
- skill.md: new page for skill workflow tools
- config.mjs: sidebar/nav updates
- architecture.md, prd updates


### Code Refactoring

* **dev:** improve dev-explore, dev-commit, dev-diff, dev-docs quality

- dev-explore: new researcher and proposal-writer agents
- dev-commit/diff/docs: quality and instruction improvements

## [1.33.4](https://github.com/cloudvoyant/codevoyant/compare/v1.33.3...v1.33.4) (2026-03-21)

### Bug Fixes

* **spec-bg:** remove context:fork so confirmation uses AskUserQuestion

- AskUserQuestion unavailable in forked agents; inline fixes it
- add skills:install mise task

## [1.33.3](https://github.com/cloudvoyant/codevoyant/compare/v1.33.2...v1.33.3) (2026-03-21)

### Bug Fixes

* **spec-bg:** use AskUserQuestion for execution confirmation

- Remove agent: spec-executor (blocked AskUserQuestion in forked context)
- Rewrite Step 4 to call AskUserQuestion tool explicitly
- Prevent skill from falling back to printed numbered list


### Documentation

* **product:** add Q2 2026 platform roadmap and 11 feature PRDs

- Add quarterly roadmap with ASCII timeline and pipeline diagrams
- Add PRDs for: skills solidification, claw harness (spike + buildout),
  performance, DX config, SvelteKit, TypeScript, lo-fi PRD, platform
  engineering, Playwright e2e, Firebase NoSQL skills


### Code Refactoring

* **skills:** move skill-create/review to .claude/skills

- Delete skills/skill-create and skills/skill-review (now in .claude/skills/)
- Remove plugin-era wiring references from deleted skill files
- Update pm-plan to reflect new workflow and plan storage conventions

## [1.33.2](https://github.com/cloudvoyant/codevoyant/compare/v1.33.1...v1.33.2) (2026-03-21)

### Bug Fixes

* **skills:** use linear-server MCP instead of claude_ai_Linear

- Switch all Linear tool calls from mcp__claude_ai_Linear to
  mcp__linear-server across pm-plan, pm-prd, em-plan, em-update,
  spec-new, and linear-push-guide reference

## [1.33.1](https://github.com/cloudvoyant/codevoyant/compare/v1.33.0...v1.33.1) (2026-03-21)

### Bug Fixes

* **skills:** fix gaps in pm-plan and em-plan from critique

pm-plan:
- remove --silent flag (parsed but never actioned)
- replace "ticket-fetch pattern" orphan with explicit Linear/GitHub/Notion MCP calls
- fix Quality Checkpoint criterion 2 using BLOCK label for non-blocking case
- defer OUTPUT_FILE derivation to after product scope is known (Step 1.5)
- update filename format to include PRODUCT_SLUG segment
- enforce zero-sum rule in Step 6 Expansion branch
- add full PRD subagent prompt template in Step 8

em-plan:
- remove --silent flag (parsed but never actioned)
- add explicit MCP dispatch for "Pull from Linear" branch in Step 2
- gate Step 9 notification on BG_MODE
- remove BLOCK label from Quality Checkpoint criterion 3 (warn only)
- tighten trigger phrases to reduce false positives

## [1.33.0](https://github.com/cloudvoyant/codevoyant/compare/v1.32.0...v1.33.0) (2026-03-21)

### Features

* **skills:** add skill-critique and planning guardrails

- skill-critique: evaluates skills across 5 dimensions (objective
  clarity, instruction quality, template quality, trigger accuracy,
  actionability); outputs Pass/Needs Work/Major Issues verdict
- em-plan, pm-plan, pm-prd, ux-explore: add Critical Principles and
  Anti-Patterns sections to guide quality planning

## [1.32.0](https://github.com/cloudvoyant/codevoyant/compare/v1.31.1...v1.32.0) (2026-03-21)

### Features

* **mem:** rename mem remember to mem list

* **mem:** rename mem remember to mem list

Renames the CLI subcommand `mem remember` to `mem list`, renames the
skills/mem-remember/ folder to skills/mem-list/, and updates all
references across source, tests, docs, skills, hooks, and CLAUDE.md.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **config:** split codevoyant.json into plans.json + worktrees.json, remove plugins from settings

* **config:** split codevoyant.json into plans.json + worktrees.json, remove plugins from settings

- Add PlansFile and WorktreesFile types; make PlanEntry.plugin optional; deprecate CodevoyantConfig
- Add readPlans/writePlans and readWorktrees/writeWorktrees with atomic write pattern
- readSettings now auto-creates settings.json when missing
- plans commands use --dir instead of --registry; migrate command targets codevoyant.json→plans.json+worktrees.json
- worktrees commands derive dir from --registry path.dirname for backward compat
- init creates plans.json + worktrees.json; auto-migrates from codevoyant.json when present
- getCurrentPlan reads worktrees.json instead of settings.worktreeMap
- Export new types and functions from index.ts
- Update all tests and docs to reflect new file layout

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;


### Documentation

* **agent-kit:** reframe as operations toolkit, document all CLI commands

* **home:** replace platform tagline with npx skills install command

* **install:** simplify installation page, add compatibility notes

## [1.31.1](https://github.com/cloudvoyant/codevoyant/compare/v1.31.0...v1.31.1) (2026-03-21)

### Bug Fixes

* **docs:** escape angle brackets in changelog to prevent VitePress parse error

## [1.31.0](https://github.com/cloudvoyant/codevoyant/compare/v1.30.1...v1.31.0) (2026-03-21)

### Features

* **docs:** drop plugin terminology, add skill:create and skill:review

- Rename docs/plugins/ → docs/skills/ and update all /plugins/ links
- Move architecture.md into docs/
- Replace "Plugin" heading suffixes and body copy with skills terminology
- Simplify installation.md — remove deleted curl install scripts
- Remove mem2 experiment (skills/mem2/)
- Move skill-create and skill-review from .claude/skills/ to skills/
- Update name fields to colon-scoped: skill:create, skill:review

## [1.30.1](https://github.com/cloudvoyant/codevoyant/compare/v1.30.0...v1.30.1) (2026-03-21)

### Bug Fixes

* remove legacy plugin structure and update mem2 argument hint

- delete .claude-plugin/marketplace.json and plugins/ plugin.json files
- remove e2e/tests/marketplace.test.ts (tested deleted structure)
- update mem2 argument-hint to list concrete subcommands

## [1.30.0](https://github.com/cloudvoyant/codevoyant/compare/v1.29.3...v1.30.0) (2026-03-21)

### Features

* restructure to flat skills/ directory for npx skills compatibility

- Move all 46 skills from plugins/*/skills/*/ to skills/`<group>`-`<skill>`/
- Add colon-scoped name fields (dev:commit, mem:find, etc.) for npx skills discovery
- Add mem2 experiment: unified skill with commands/ subdir routing
- Bundle agents into relevant skill dirs (spec-bg, spec-go, spec-new, spec-update, dev-explore)
- Add packages/claude-skill-converter for flat skills/ → target format conversion
- Update marketplace.json, .releaserc.json, mise.toml, release.yml for flat structure
- Remove plugins/ hierarchy, install scripts, and install-based e2e tests
- Fix mem.ts: remove docs from EXCLUDED_DIRS so docs/styleguide/ files get indexed
- Add MemSettings.docsDir (default: docs) — configurable via .codevoyant/settings.json
- Update mem:learn and mem2 commands to read mem.docsDir setting at runtime
- Move e2e fixtures from demo-project/styleguide/ to demo-project/docs/styleguide/
- Update e2e tests for flat skills/ structure and new docs paths

## [1.29.3](https://github.com/cloudvoyant/codevoyant/compare/v1.29.2...v1.29.3) (2026-03-21)

### Bug Fixes

* **mem:** use colon-scoped name field (mem:find) for npx skills compat

## [1.29.2](https://github.com/cloudvoyant/codevoyant/compare/v1.29.1...v1.29.2) (2026-03-21)

### Bug Fixes

* add explicit skills arrays to marketplace.json for npx skills


### Documentation

* **mem:** add mem plugin docs page, icon, and homepage card

- Add CPU processor SVG icon (mem.svg) in project palette
- Add mem feature card to homepage with Experimental label
- Add sidebar entry "Mem · Experimental"
- Update mem plugin doc page with icon and SVG reference

* align ux and mem plugin page headers with em/pm style

- Add icon img and Badge to ux.md
- Rename heading and add Badge to mem.md

## [1.29.1](https://github.com/cloudvoyant/codevoyant/compare/v1.29.0...v1.29.1) (2026-03-20)

### Bug Fixes

* **docs:** escape angle brackets in changelog to fix VitePress build

## [1.29.0](https://github.com/cloudvoyant/codevoyant/compare/v1.28.0...v1.29.0) (2026-03-20)

### Features

* **mem:** rename memory plugin to mem

- Rename plugins/memory/ → plugins/mem/
- Update plugin name, install scripts, marketplace, release config
- Add RAM icon and update docs nav

## [1.28.0](https://github.com/cloudvoyant/codevoyant/compare/v1.27.0...v1.28.0) (2026-03-20)

### Features

* **agent-kit:** add ci, perms, mem, settings commands

- add ci detect command for CI provider detection from git remote URL
  with CLI fallback (gh/glab); outputs JSON with provider and remote
- add perms command for agent-aware permission management; detects
  Claude Code, OpenCode, VS Code Copilot via env vars; merges allow
  entries into agent-specific config files
- add mem and settings commands for project memory and config management
- export detectAgent, buildClaudeAllow, mergeClaudeAllow,
  PLUGIN_PERMISSIONS, detectCIProvider, CIInfo, CIProvider from index
- add unit tests for ci, perms, mem detection logic

feat: add per-plugin allow skills

- add allow skill to spec, em, pm, ux plugins (one-liner each)
- simplify dev:allow to delegate to agent-kit perms add
- each plugin's allow skill calls perms add --plugins &lt;name&gt;

feat(dev): rewrite dev:ci skill

- use npx @codevoyant/agent-kit ci detect for provider detection
- remove --wait flag: CI monitoring always runs in background
- remove Example Usage section (examples are noise, not best practice)


### Bug Fixes

* correct background agent blocks and release workflow

- Replace TaskCreate: with Agent: in ci, commit, pr-fix, pm:plan, spec:bg
- Add OpenCode compat note: interpret Agent: blocks as Task: invocations
- Remove deleted adr plugin from release.yml asset list
- Add em, memory, pm, ux plugins to release.yml asset list

* **release:** update plugin list in releaserc and workflow

- Replace adr/spec with dev, em, memory, pm, spec, ux in prepareCmd
- Update git assets to match current plugin set
- Remove adr from release.yml GitHub release assets (already done)


### Documentation

* add memory plugin docs and update plugin references

- Add docs/plugins/memory.md with full plugin documentation
- Update dev, em, pm, spec plugin docs
- Expand agent-kit reference with new commands (ci, mem, perms, settings)
- Update user-guide.md and vitepress nav config
- Add mem integration tests and e2e test suite
- Update mise.toml with e2e test task
- Fix yaml fence in dev:ci SKILL.md

## [1.27.0](https://github.com/cloudvoyant/codevoyant/compare/v1.26.0...v1.27.0) (2026-03-20)

### Features

* **ux:** add ux plugin with docs, icon, and marketplace entry

- Add ux plugin skills: prototype, explore, style-synthesize, help
- Add marketplace.json entry and docs/plugins/ux.md reference page
- Add ux to docs homepage features grid, user-guide, and sidebar
- Add docs/public/icons/ux.svg in project icon style
- Update e2e EXPECTED_COMMANDS to include ux skills

## [1.26.0](https://github.com/cloudvoyant/codevoyant/compare/v1.25.0...v1.26.0) (2026-03-20)

### Features

* **dev:** add dev:plan skill for architecture docs

* **em:** rewrite em:plan as local-first Linear workflow

- Add --delegate, --continue, --push flags
- Delete em:breakdown, em:sync, em:docs
- Update em:update to use tasks/ dir
- Add plan-template, task-template, linear-push-guide references

* **pm:** rewrite pm:plan and pm:prd with Linear doc attachments

- Output roadmaps to docs/product/roadmaps/YYMMDD-{type}-roadmap.md
- Output PRDs to docs/prd/YYMMDD-{scope}-prd.md
- Add tag-based product discovery in pm:plan
- Add Linear initiative/project attachment on confirmation
- Delete pm:breakdown, pm:docs
- Add roadmap-template and prd-template references


### Tests

* **e2e:** add em and pm workflow test coverage

## [1.25.0](https://github.com/cloudvoyant/codevoyant/compare/v1.24.2...v1.25.0) (2026-03-20)

### Features

* **agent-kit:** add git, task-runner, worktree overhaul; remove style plugin

- Remove plugins/style/ entirely; clean up all cross-references
- Simplify spec:new: remove Step 4.3 exploration, proposals/, spec:worktree
- Add dev:explore skill for standalone technical research and proposals
- Overhaul worktrees: global path ~/codevoyant/[repo]/worktrees/[plan],
  add attach/detect subcommands, isInWorktree(), getRepoName() exports
- Add task-runner detect/list/run commands with justfile→task→mise→make→
  npm/pnpm/yarn priority; falls back to raw config if binary absent
- Add git repo-name/branch/issue-id/info subcommands with edge case guards
- Rewrite all 40 SKILL.md descriptions with intent-based ≤512-char pattern
- Add 72 new unit tests (project, git, task-runner, fallback)
- Update docs/reference/cli.md and agent-kit.md with new APIs


### Bug Fixes

* **test:** configure git user in beforeEach to fix CI branch detection

- git commit --allow-empty fails silently in CI without user.email/name,
  leaving the repo in unborn-branch state and causing all branch tests
  to return HEAD
- Remove stale plugins/style/.claude-plugin/plugin.json from release.yml
  GitHub Release file list (style plugin was deleted)

* **release:** remove style plugin from semantic-release prepareCmd and assets

## [1.24.2](https://github.com/cloudvoyant/codevoyant/compare/v1.24.1...v1.24.2) (2026-03-19)

### Bug Fixes

* **agent-kit:** replace node-notifier with direct osascript/spawnSync

- node-notifier fired async and exited before notification was sent
- Replace with synchronous spawnSync osascript on macOS, notify-send on Linux
- Remove node-notifier and @types/node-notifier dependencies

## [1.24.1](https://github.com/cloudvoyant/codevoyant/compare/v1.24.0...v1.24.1) (2026-03-19)

### Bug Fixes

* **docs:** use vitesse-light instead of unbundled tokyo-night-light


### Documentation

* fix feature grid layout, use tokyo-night theme, fix spec file tree

## [1.24.0](https://github.com/cloudvoyant/codevoyant/compare/v1.23.3...v1.24.0) (2026-03-19)

### Features

* add e2e tests and hardcode help skills with disable-model-invocation

* **commit:** update commit skill with --atomic flag guidance

* **help:** update help skills across all plugins

* **install:** use colon names and strip Claude-specific frontmatter

- Skill name: now uses prefix:skill format (dev:commit) for IDE autocomplete
- opencode: strip model: and disable-model-invocation: from skills
- opencode: strip tools: and hooks: from agent files
- vscode: install agents globally to ~/.copilot/agents/


### Documentation

* update VitePress config, theme, and plugin docs


### Tests

* **e2e:** add claude tests and update for colon name format

- Update skill name assertions to expect prefix:skill format
- Add test for stripping model: and disable-model-invocation: fields
- Update vscode agent dir to ~/.copilot/agents/
- Add new claude.test.ts for Claude Code installation
- Add test:e2e script to package.json

## [1.23.3](https://github.com/cloudvoyant/codevoyant/compare/v1.23.2...v1.23.3) (2026-03-19)

### Bug Fixes

* add e2e tests for plugin installation and remove justfile

- packages/e2e: vitest tests for Claude marketplace structure,
  OpenCode install (uninstall→install→verify→uninstall), and
  VS Code Copilot install; 178 tests covering all plugins/skills
- fix install-vscode.sh: --git-toplevel → --is-inside-work-tree
- fix marketplace.json: remove trailing comma (invalid JSON)
- delete justfile: fully superseded by mise.toml

## [1.23.2](https://github.com/cloudvoyant/codevoyant/compare/v1.23.1...v1.23.2) (2026-03-19)

### Bug Fixes

* update readme tagline

## [1.23.1](https://github.com/cloudvoyant/codevoyant/compare/v1.23.0...v1.23.1) (2026-03-19)

### Bug Fixes

* set publishConfig access public for scoped npm package

## [1.23.0](https://github.com/cloudvoyant/codevoyant/compare/v1.22.1...v1.23.0) (2026-03-19)

### Features

* add @codevoyant/agent-kit pnpm monorepo package

Introduces packages/agent-kit — a TypeScript package that ships both a
CLI binary (codevoyant) and a library API. Replaces inline JSON prose
and notify.sh path-resolution loops across all ~20 skill plugins.

- CLI commands: init, plans (register/update/archive/migrate),
  notify (node-notifier), worktrees (create/remove/prune/export)
- Library exports: readConfig, writeConfig, getConfigPath, readSettings
- Atomic config writes (tmp + rename) to .codevoyant/codevoyant.json
- 40 passing tests (unit + integration)
- mise task runner replacing justfile; jdx/mise-action@v2 in CI/CD
- 48 notify.sh files deleted; all skills updated to use CLI
- VitePress reference docs: cli.md and agent-kit.md


### Bug Fixes

* pass NODE_AUTH_TOKEN to semantic-release upversion step


### Code Refactoring

* convert utils to internal shared source, not an installable plugin

- Remove utils from marketplace and delete its plugin.json
- Add just sync-utils recipe: copies scripts/* to every skill's scripts/,
  utils.md to every skill's references/ (no-clobber), and skills/* to
  every plugin's skills/ with {plugin} substitution
- Consolidate help skill into utils/skills/help/SKILL.md as single source
  of truth; synced to all plugins with plugin name substituted
- Move notify from skill to utils.md (pattern docs) + notify.sh (script)
- Update em/pm skills to call notify.sh via bash directly
- Update spec skills to use local plugins/spec/scripts/notify.sh
- Update dev:docs to use local plugins/dev/scripts/notify.sh
- Remove utils plugin section from dev:allow
- Update README and docs to remove utils install instructions

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

## [1.22.1](https://github.com/cloudvoyant/codevoyant/compare/v1.22.0...v1.22.1) (2026-03-18)

### Bug Fixes

* remove invalid skills field from plugin manifests and add em/pm/utils to marketplace

* remove invalid skills field from spec and dev plugin manifests

## [1.22.0](https://github.com/cloudvoyant/codevoyant/compare/v1.21.0...v1.22.0) (2026-03-18)

### Features

* add em, pm, and utils plugins with docs and validation

- New plugins: em (engineering management), pm (product management),
  utils (shared notifications)
- Icons for em, pm, utils in docs/public/icons/
- Plugin docs pages: docs/plugins/em.md, pm.md, utils.md
- Homepage: remove utils from features, EM/PM all-caps throughout
- em:plan and pm:plan: validation loop after artifact generation
- em:update and pm:update: annotation + conversational update skills
- Notify calls migrated from bash paths to /utils:notify skill
- spec and dev plugin improvements (review skill, allow skill, docs
  skill, notify pattern refactor)


### Documentation

* add style:help to style plugin docs

## [1.21.0](https://github.com/cloudvoyant/codevoyant/compare/v1.20.1...v1.21.0) (2026-03-18)

### Features

* add help skills, open exploration, and bg flags to spec skills

- Add help skill to spec, dev, style, adr plugins (discovers siblings
  dynamically via $SKILL_DIR, reads plugin.json for header)
- Rewrite spec:new Step 4.3: open-ended free-text exploration offer,
  parallel proposal generation with file verification, post-gen
  selection not limited to generated proposals
- Fix spec:new user-guide generation: mark REQUIRED, add blocking
  validation in Step 5.5 that includes plan.md and user-guide.md
- Add --bg/--silent flags to spec:go, spec:refresh, spec:update with
  desktop notification on completion
- Expand dev:allow shared baseline to include Read, Glob, Grep
- Update .gitignore: .codevoyant replaces legacy .spec/plans patterns


### Documentation

* add adr plugin, help command, and --bg flag to README

- Add adr plugin to plugins table (was missing)
- Update spec description to mention --bg flag
- Add /plugin:help examples to quick start
- Fix spec:bg → spec:go --bg in quick start

* sync plugin docs with current skill state

spec.md:
- Update background workflow to show spec:go --bg alongside spec:bg
- Rewrite architecture exploration description for open-ended flow
- Add --bg/--silent flags to spec:go, spec:refresh, spec:update
- Document spec:help command

dev.md:
- Add dev:allow section (was entirely missing)
- Add dev:help command

README.md:
- Remove adr plugin from plugins table (not publicly listed yet)

## [1.20.1](https://github.com/cloudvoyant/codevoyant/compare/v1.20.0...v1.20.1) (2026-03-16)

### Bug Fixes

* add style plugin to release pipeline and fix stale org refs

- style/plugin.json was stuck at 1.0.0 and excluded from the release
  prepareCmd and git assets, so users never received path updates
- Corrects codevoyant → cloudvoyant org in style README and metadata
- Fixes commit skill to display full message before confirmation


### Documentation

* remove adr from readme plugin table and install commands

* rewrite README with logo, plugin overview, and docs links

* update README tagline

## [1.20.0](https://github.com/cloudvoyant/codevoyant/compare/v1.19.0...v1.20.0) (2026-03-16)

### Features

* **dev:** add dev:allow skill for autonomous execution permissions

Generates and applies permission configs for Claude Code, OpenCode, and
VS Code Copilot. Plugin-scoped via --plugins flag with interactive
selection fallback. Includes explicit git push confirmation, Write/Edit
pre-approval for .codevoyant/, and Bash(git commit -m:*) entries to
prevent $() substitution prompts during automated commits.

* **spec:** add spec-explorer agent for parallel proposal generation

Introduces spec-explorer with four modes (write, update, bulk-update,
synthesize) to replace anonymous Task agents in spec:new. Proposals
are now generated and updated in parallel with a consistent persona.
Adds return-to-proposals path when planning reveals a problem.

## [1.19.0](https://github.com/cloudvoyant/codevoyant/compare/v1.18.1...v1.19.0) (2026-03-16)

### Features

* add agent installation to OpenCode/VS Code install scripts + fix GitHub org

- install-opencode.sh: copy agent .md files to ~/.config/opencode/agents/,
  inject name: frontmatter if absent
- install-vscode.sh: copy agent files as .agent.md to .github/agents/ in
  current git workspace; skip gracefully if not in a git repo
- Fix GitHub org codevoyant → cloudvoyant across all docs and install scripts
- Add compatibility note to bg/SKILL.md and new/SKILL.md explaining that
  agent: and context: fork fields are Claude Code-specific and run inline
  on OpenCode and VS Code Copilot

## [1.18.1](https://github.com/cloudvoyant/codevoyant/compare/v1.18.0...v1.18.1) (2026-03-15)

### Bug Fixes

* **docs:** correct GitHub org from codevoyant to cloudvoyant

## [1.18.0](https://github.com/cloudvoyant/codevoyant/compare/v1.17.0...v1.18.0) (2026-03-15)

### Features

* **spec:** replace README.md plan tracker with spec.json

Migrate plan metadata from a markdown README to a structured JSON
file at .codevoyant/spec.json with activePlans and archivedPlans
arrays. All skills updated to read/write JSON instead of markdown.


### Documentation

* remove AI-specific language and fix style file structure

Replace generic "Claude" references with "the AI" or passive voice.
Fix style plugin file structure to match what /style:init actually
generates (no docs/style-guide/ directory).

## [1.17.0](https://github.com/cloudvoyant/codevoyant/compare/v1.16.0...v1.17.0) (2026-03-15)

### Features

* **spec:** prompt for plan selection when multiple plans exist + add spec triggers

- Replace silent auto-select with AskUserQuestion prompt when multiple
  plans exist in go, bg, stop, refresh, update, done skills
- Add plan-selection Step 0 to delete and rename skills (previously
  required argument only)
- Add "spec out / spec this / speccing" trigger keywords to new skill
- Add "spec go / run the spec" triggers to go skill
- Add "spec bg / spec background" triggers to bg skill

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;


### Bug Fixes

* **docs:** replace .spec/plans/ and .worktrees/ paths with .codevoyant/ equivalents

Update architecture.md and user-guide.md to reflect the renamed directory
structure, replacing legacy `.spec/plans/` references with `.codevoyant/plans/`.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **docs:** update migration-guide paths from .spec/plans/ to .codevoyant/plans/

Replace all occurrences of `.spec/plans/` with `.codevoyant/plans/` and
`.spec/` directory reference with `.codevoyant/` in the migration guide
to reflect the project rename.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **docs:** update style plugin config path to .codevoyant/style.json

Move style.json to .codevoyant/ level in the file structure diagram
and remove the incorrect .codevoyant/style/config.json path.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;


### Documentation

* **dev:** expand Safe Rebase section with full flow documentation

Add how-it-works steps covering intent snapshot, confirmation dialog,
conflict resolution logic, post-rebase verification, and push safety.
Also document the rebasing-main shortcut and available flags.

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

* **spec:** fix stale paths, expand planning flow and UX documentation

- Replace all .spec/plans/ and .worktrees/ references with .codevoyant/ equivalents (6 occurrences)
- Expand /spec:new section with research phase, worktree prompt, and final review descriptions
- Add inline annotations subsection under /spec:go with syntax reference and examples
- Add plan-selection note to Best Practices

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

## [1.16.0](https://github.com/cloudvoyant/codevoyant/compare/v1.15.2...v1.16.0) (2026-03-15)

### Features

* centralize plugin artifacts under .codevoyant + flatten configs

Migrate all spec and style plugin artifact paths to a unified
.codevoyant/ layout for discoverability and gitignore hygiene.

Changes:
- Spec plugin: .spec/plans/ → .codevoyant/plans/ (all 12 skill files,
  hooks.json regex, agents, scripts, templates, pr-body-template)
- Spec plugin: .worktrees/ → .codevoyant/worktrees/ (worktree skill,
  create-worktree-steps.md, list display examples)
- Style plugin: .codevoyant/style/config.json → .codevoyant/style.json
  (all 6 skill files + README.md); doctor skill auto-migrates old path
- New: spec:doctor skill — auto-detects and migrates legacy paths
- New: migration.md reference doc — manual migration steps
- Improved: proposal-template.md with directory structure section,
  flow diagram guidance, references section, and refinement syntax note

Co-Authored-By: Claude Sonnet 4.6 &lt;noreply@anthropic.com&gt;

## [1.15.2](https://github.com/cloudvoyant/codevoyant/compare/v1.15.1...v1.15.2) (2026-03-15)

### Bug Fixes

* **docs:** use withBase composable for plugin icon paths

## [1.15.1](https://github.com/cloudvoyant/codevoyant/compare/v1.15.0...v1.15.1) (2026-03-15)

### Bug Fixes

* **docs:** use $withBase for plugin icon paths to fix build

## [1.15.0](https://github.com/cloudvoyant/codevoyant/compare/v1.14.0...v1.15.0) (2026-03-15)

### Features

* rename project to codevoyant, add custom plugin icons

Renames all claudevoyant/cloudvoyant references to codevoyant,
adds SVG icons for spec/dev/style plugins, updates brand colors
and hero responsive styles, and adds plugin icons to doc pages.

## [1.13.1](https://github.com/codevoyant/codevoyant/compare/v1.13.0...v1.13.1) (2026-03-15)

### Bug Fixes

* correct hero image paths (remove duplicate base prefix)

## [1.13.0](https://github.com/codevoyant/codevoyant/compare/v1.12.2...v1.13.0) (2026-03-15)

### Features

* add light/dark favicons and logo, add just favicons recipe

## [1.12.2](https://github.com/codevoyant/codevoyant/compare/v1.12.1...v1.12.2) (2026-03-15)

### Bug Fixes

* remove invalid hooks path from plugin manifests

## [1.12.1](https://github.com/codevoyant/codevoyant/compare/v1.12.0...v1.12.1) (2026-03-14)

### Bug Fixes

* set base path for GitHub Pages deployment

## [1.12.0](https://github.com/codevoyant/codevoyant/compare/v1.11.2...v1.12.0) (2026-03-14)

### Features

* add docs site and migrate plugins to skills/hooks architecture

- Replace commands with skills, hooks, and agents across all plugins
- Add VitePress documentation site with plugin reference pages
- Split user guide into Installation and User Guide pages
- Add GitHub Actions workflow for docs deployment

## [1.11.2](https://github.com/codevoyant/codevoyant/compare/v1.11.1...v1.11.2) (2026-02-23)

### Bug Fixes

* **dev:rebase:** use git add -f for gitignored conflicted files

During rebase, conflicts in gitignored files (e.g. .spec/) cannot be
staged with plain `git add`, making --continue impossible. The previous
workaround of using --skip silently drops the entire commit.

Now checks git check-ignore before staging; gitignored files use
git add -f so --continue works correctly. Also adds an explicit 4d
rule prohibiting --skip during conflict resolution.

## [1.11.1](https://github.com/codevoyant/codevoyant/compare/v1.11.0...v1.11.1) (2026-02-22)

### Bug Fixes

* disable commits by default in bg agent, add --commit flag

The background agent was committing during execution without explicit
user consent. Commits are now disabled by default. Pass --commit or
-c to opt in to agent-driven commits.

## [1.11.0](https://github.com/codevoyant/codevoyant/compare/v1.10.0...v1.11.0) (2026-02-22)

### Features

* add rebase and export commands, fix worktree paths, add format/lint to commit

- Add dev:rebase — intent-snapshot-driven rebase with conflict resolution,
  format/lint/test verification, and --push flag for CI monitoring
- Add spec:export — copy worktree plan to main repo .spec/plans/
- Fix spec:new hardcoded .spec/plans/ paths that ignored $PLAN_DIR in
  worktree context (steps 5.4, 5.5, 5.6)
- Add format/lint step to dev:commit (Step 1.5) before staging
- Add format/lint/test checks to dev:rebase verification (Step 5)

## [1.10.0](https://github.com/codevoyant/codevoyant/compare/v1.9.0...v1.10.0) (2026-02-22)

### Features

* rename style plugin and add spec:update and style:review commands

- Rename styleguide plugin to style across all config, command files,
  and marketplace registrations
- Add spec:update command: processes @change(...) annotations inline
  in plan files without requiring flags
- Add style:review command: parallel background agents per section
  write structured REVIEW.md for follow-up agent consumption
- Add spec:new Step 5.6: iterative validation loop (min 2 rounds)
  with auto-fix using background agents
- Fix dev:commit: push and monitor CI automatically; add --no-push flag

## [1.9.0](https://github.com/codevoyant/codevoyant/compare/v1.8.0...v1.9.0) (2026-02-19)

### Features

* create plans inside worktree for complete isolation

When using --branch flag, plan now lives in the worktree:
- Before: .spec/plans/my-plan/ (main repo)
- After: .worktrees/branch/.spec/plans/my-plan/ (in worktree)

Benefits:
- Complete isolation - everything for feature in one place
- cd to worktree and run /spec:bg directly
- Delete worktree = delete plan (clean)
- Clearer context - you're IN the feature directory

Workflow:
1. /spec:new my-feature --branch feature-x
2. cd .worktrees/feature-x/
3. /spec:bg my-feature (works! plan is here)
4. Make changes, all isolated

Plans without worktrees still go in main repo as before.

## [1.8.0](https://github.com/codevoyant/codevoyant/compare/v1.7.1...v1.8.0) (2026-02-18)

### Features

* add --yes flag to skip confirmations in commands

Add --yes/-y flag support for non-interactive execution:

/dev:commit --yes:
- Skip commit message approval
- Auto-push and verify CI
- Perfect for CI/CD and scripts

/spec:bg --yes:
- Auto-create missing worktree
- Skip execution confirmation
- Start immediately

This enables fully automated workflows without manual confirmation steps.

## [1.7.1](https://github.com/codevoyant/codevoyant/compare/v1.7.0...v1.7.1) (2026-02-13)

### Bug Fixes

* prevent bg agent from asking questions mid-execution

Background agents should execute ALL phases autonomously without
asking for permission to continue. Added explicit instructions to:
- Never ask "Should I continue?" or "Want me to proceed?"
- Automatically move between phases
- Only stop on actual errors, not for user approval

This fixes agents stopping after each phase and asking if user
wants to continue.

## [1.7.0](https://github.com/codevoyant/codevoyant/compare/v1.6.1...v1.7.0) (2026-02-13)

### Features

* auto-handle worktrees in spec execution commands

Seamless worktree workflow:
- Automatically execute in worktree if it exists (no manual cd)
- Offer to create worktree if missing (one-step setup)
- Handle all cases: exists, missing, or not needed

Changes:
- /spec:bg and /spec:go now detect worktree from plan metadata
- If worktree exists, automatically cd and execute there
- If worktree specified but missing, prompt to create it
- Agent executes with correct directory context
- No more manual "cd .worktrees/branch && /spec:bg" steps

This makes worktree-based development fully automatic.

## [1.6.1](https://github.com/codevoyant/codevoyant/compare/v1.6.0...v1.6.1) (2026-02-13)

### Bug Fixes

* remove redundant questions from commit CI monitoring

Automatically monitor CI after push without asking additional questions.
User gets one prompt (push + verify?) then monitoring happens automatically.

Before: Ask to push → ask to monitor → monitor
After: Ask to push → automatically monitor

Reduces friction and makes workflow faster.

## [1.6.0](https://github.com/codevoyant/codevoyant/compare/v1.5.0...v1.6.0) (2026-02-13)

### Features

* optimize commit command and add automatic CI verification

Speed improvements:
- Use conversation context instead of re-reading git logs
- Skip redundant file reads when context is available
- Eliminate unnecessary git log lookups

New functionality:
- Automatically offer to push and verify CI after commit
- Monitor GitHub Actions workflows to ensure changes pass
- Only declare work complete after CI validates changes
- Gracefully handle repos without CI or gh CLI

This addresses the issue where Claude declares work "done" without
verifying that tests, builds, and other automated checks actually pass.

## [1.5.0](https://github.com/codevoyant/codevoyant/compare/v1.4.2...v1.5.0) (2026-02-12)

### Features

* add GitHub Actions monitoring skill to dev plugin

Add /dev:actions command that monitors CI/CD workflows to verify
changes pass automated checks. Prevents declaring work "done" when
tests, builds, or other workflows are failing.

Features:
- Check status of recent workflow runs
- Wait for in-progress workflows to complete
- Display pass/fail status with timing
- Fetch and show error logs on failure
- Offer to help fix issues when workflows fail

## [1.4.2](https://github.com/codevoyant/codevoyant/compare/v1.4.1...v1.4.2) (2026-02-12)

### Bug Fixes

* remove invalid commands field from styleguide plugin manifest

Commands are auto-discovered from the commands/ directory and should
not be declared in plugin.json. This was causing validation errors
during plugin installation.

## [1.4.1](https://github.com/codevoyant/codevoyant/compare/v1.4.0...v1.4.1) (2026-02-12)

### Bug Fixes

* move styleguide plugin to correct structure for marketplace

Moves plugin.json to .claude-plugin/ subdirectory and adds styleguide
to marketplace index. Plugin was not discoverable due to incorrect
file structure.

## [1.4.0](https://github.com/codevoyant/codevoyant/compare/v1.3.0...v1.4.0) (2026-02-12)

### Features

* add styleguide plugin with contextual loading and auto-learning

Introduces intelligent style guide management that learns from user
corrections and loads rules contextually to minimize token usage.

Key features:
- Contextual rule loading (74% token savings)
- Automatic pattern learning from corrections
- Team-wide CLAUDE.md for shared conventions
- Validation and auto-fix capabilities
- Pattern extraction from existing codebase
- Token optimization strategies

Commands:
- /styleguide:init - Initialize CLAUDE.md with context tags
- /styleguide:add - Add rules manually with contexts
- /styleguide:learn - Auto-learn from work patterns
- /styleguide:validate - Check compliance
- /styleguide:extract - Discover existing patterns
- /styleguide:optimize - Reduce token usage
- /styleguide:contexts - Manage context system

Co-Authored-By: Claude Sonnet 4.5 &lt;noreply@anthropic.com&gt;

## [1.3.0](https://github.com/codevoyant/codevoyant/compare/v1.2.0...v1.3.0) (2026-02-12)

### Features

* add implementation validation and worktree support to spec plugin

Enhances spec plugin with upfront implementation file validation and
git worktree integration for branch-based plan isolation.

Key improvements:
- Require all phase implementation files created before execution
- Validate files exist and meet size requirements pre-execution
- Add --branch flag to auto-create worktrees for plan isolation
- Track branch/worktree metadata in plan files
- Add branch validation to all execution commands
- Introduce /spec:worktree command for manual worktree management
- Migrate from .claude/plan.md to .spec/plans/{plan-name}/ structure
- Support multiple concurrent plans with independent contexts

Co-Authored-By: Claude Sonnet 4.5 &lt;noreply@anthropic.com&gt;

## [1.2.0](https://github.com/codevoyant/codevoyant/compare/v1.1.2...v1.2.0) (2025-11-17)

### Features

* add background execution commands to spec plugin

Adds /bg, /status, and /stop commands enabling autonomous plan execution
using Claude Code's agent system. Users can now start background execution,
monitor progress, and control execution while continuing other work.

Also removes markdown linting configs and updates documentation.

## [1.1.2](https://github.com/codevoyant/codevoyant/compare/v1.1.1...v1.1.2) (2025-11-17)

### Bug Fixes

* docs updated

* updated semantic release config based on new dir structure


### Code Refactoring

* move plugins into plugins directory

Restructures repository to match Anthropic's official marketplace
layout with all plugins under a single plugins/ parent directory.
Updates marketplace.json source paths accordingly.

## [1.1.1](https://github.com/codevoyant/codevoyant/compare/v1.1.0...v1.1.1) (2025-11-16)

### Bug Fixes

* use relative paths in marketplace.json for monorepo structure

Changes plugin sources from GitHub object format to relative paths,
following Anthropic's recommended pattern for monorepo marketplaces.
Also corrects outdated plugin name in README installation example.

## [1.1.0](https://github.com/codevoyant/codevoyant/compare/v1.0.3...v1.1.0) (2025-11-16)

### Features

* restructure into three plugins and add repository diff command

Splits monolithic plugin into specialized plugins:
- codevoyant-adr: Architecture Decision Records
- codevoyant-dev: Development workflows (docs, review, commits, diff)
- codevoyant-spec: Specification-driven development

Adds new /diff command to compare repositories and generate
comprehensive diff reports with insights and analysis.

Updates marketplace.json to reference three separate plugins
with individual paths and descriptions.


### Bug Fixes

* remove codevoyant prefix from plugin names

Fixes plugin installation by ensuring plugin names match between
marketplace.json and individual plugin.json files. Removes the
obsolete root plugin.json as the repository now contains three
separate plugins (adr, dev, spec).

* update semantic-release config for multi-plugin structure

Updates semantic-release to handle three separate plugins (adr, dev, spec)
instead of single root plugin. Simplifies commit command documentation
by removing redundant verification steps.


### Documentation

* improve installation instructions with CLI commands and version-specific installation

## [1.0.3](https://github.com/codevoyant/codevoyant/compare/v1.0.2...v1.0.3) (2025-11-16)

### Bug Fixes

* modifying plugin.json to use https with git repos

## [1.0.2](https://github.com/codevoyant/codevoyant/compare/v1.0.1...v1.0.2) (2025-11-16)

### Bug Fixes

* correct marketplace.json

* correct marketplace.json source

  format for GitHub

## [1.0.1](https://github.com/codevoyant/codevoyant/compare/v1.0.0...v1.0.1) (2025-11-16)

### Bug Fixes

* owner field must be an object in marketplace.json

## 1.0.0 (2025-11-16)

### Features

* initialize codevoyant plugin

Create Claude Code plugin with professional workflow commands:
- Planning workflow (/plan)
- Conventional commits (/commit)
- Template upgrades (/upgrade, /adapt)
- Documentation (/docs, /adr-new, /adr-capture)
- Code review (/review)

Infrastructure:
- Semantic versioning with semantic-release
- CI/CD with GitHub Actions
- BATS testing framework
- Comprehensive documentation


### Bug Fixes

* correct marketplace.json schema

Add required name and owner fields, fix source path format


### Code Refactoring

* remove unnecessary environment and script dependencies

- Remove .envrc files (not needed for plugin)
- Remove scripts directory (use semantic-release directly)
- Simplify justfile to not require direnv
- Update release workflow to use npx semantic-release
