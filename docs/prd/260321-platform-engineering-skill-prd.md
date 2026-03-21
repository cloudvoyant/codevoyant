# 260321 Platform Engineering Skill (mise, Terraform, GitHub Actions) PRD

**Scope:** project
**Product:** Platform / Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → Implementation → [Deployment] → QA
                                                    │
                                          [THIS] Platform skill
                                          mise · Terraform · GitHub Actions
```

## Problem

Claude Code agents on the Platform team cannot reliably act on infrastructure and deployment tasks autonomously because there is no formalized skill encoding how to work with mise task runners, Terraform configurations, or GitHub Actions workflows. Agents must either guess at conventions or prompt engineers must hand-hold every step, making the deployment leg of autonomous workflows a manual bottleneck. Relevant patterns already exist across `mise-lib-templates` and `mise-gcp-templates` but remain informal and un-extracted, so each new agent interaction re-discovers rather than reuses them.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.
- Skill invocation rate (mise/Terraform/GHA tasks completed without human correction): from 0 to ≥10 autonomous completions per week by 2026-05-09 (end of Week 9)
  - Source: Agent task logs; current baseline is 0 because no skill exists; target calibrated against estimated team velocity of ~15 infra tasks/week
- Pattern extraction coverage (percentage of reusable artifacts from mise-lib-templates and mise-gcp-templates formalized in the skill): from 0% to ≥80% by 2026-05-09
  - Source: Manual audit of both template repos at project kick-off; 80% threshold preserves room for rare or experimental patterns

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.
- Unmanned deployment success rate (deployments completing end-to-end without engineer intervention): from ~30% (estimated; engineers currently intervene on most runs) to ≥85% by 2026-07-01
  - Source: Deployment pipeline event logs; current figure is an estimate pending baseline instrumentation
- Mean time to deploy a net-new GCP service using the skill vs. manual: from ~2 hours to ≤30 minutes by 2026-07-01
  - Source: Stopwatch data from two most recent manual deployments (2026-02 average: 112 min)

## Non-Goals

- Building a general-purpose infrastructure provisioning agent beyond the patterns present in mise-lib-templates and mise-gcp-templates
- Supporting cloud providers other than GCP in this iteration
- Replacing or rewriting mise-lib-templates or mise-gcp-templates themselves
- Adding Terraform state management, remote backends, or workspace switching beyond what the existing templates already define
- Automated secret rotation or credentials management
- Integration with CI providers other than GitHub Actions
- Runtime monitoring or alerting post-deployment

## Users

Primary: Platform engineers at Codevoyant who use Claude Code agents to execute infrastructure and deployment tasks autonomously. Secondary: backend engineers who consume platform-managed GCP services and need repeatable, low-friction deployment pipelines.

## Requirements — Functional

**F1** [P0] mise task parsing and execution
Skill must parse and execute mise tasks defined in `mise.toml` or `.mise.toml`, resolving dependencies between tasks in the correct order. Core runner capability; pre-condition for all other features.

**F2** [P0] mise-lib-templates pattern extraction
Skill must extract and formalize all reusable task patterns from mise-lib-templates into callable skill steps. Solidification over net-new build; source repo is mise-lib-templates.

**F3** [P0] mise-gcp-templates pattern extraction
Skill must extract and formalize all reusable GCP deployment patterns from mise-gcp-templates into callable skill steps. Solidification over net-new build; source repo is mise-gcp-templates.

**F4** [P0] Terraform plan and apply
Skill must plan and apply Terraform configurations that conform to the patterns extracted in F3, including `init`, `plan`, and `apply` phases with output capture. Must respect existing module structure; no new module authoring required.

**F5** [P0] Terraform plan diff surfacing
Skill must detect Terraform plan diffs and surface a structured summary (resources to add/change/destroy) before applying. Required for unmanned safety; agent must not apply without diff inspection.

**F6** [P1] GitHub Actions workflow authoring and triggering
Skill must create, validate, and trigger GitHub Actions workflows that follow patterns present in mise-gcp-templates. Covers workflow YAML authoring, `gh workflow run`, and run status polling.

**F7** [P1] GitHub Actions run status polling
Skill must poll GitHub Actions run status and surface pass/fail with log excerpts on failure. Enables closed-loop deployment verification without human monitoring.

**F8** [P1] Help entry point
Skill must expose a `help` entry point listing available sub-skills and their required inputs. Consistent with help conventions across existing Codevoyant plugins.

**F9** [P1] Required environment variable validation
Skill must fail fast with a structured error message if required environment variables (e.g. `GCP_PROJECT`, `TF_VAR_*`) are absent. Prevents silent partial deployments.

**F10** [P2] Deployment summary artifact
Skill must produce a deployment summary artifact (JSON or Markdown) on every successful run, recording what was changed, by whom (agent session ID), and when. Audit trail; useful for post-deployment review.

## Requirements — Non-Functional

**NF1** Skill invocation latency
Target: ≤5 seconds for any sub-skill entry point. Time from skill call to first actionable output.

**NF2** Terraform plan capture before apply
Target: 100% of apply runs preceded by a stored plan artifact. Terraform plan output must be captured and stored before apply; apply must never proceed if plan capture fails.

**NF3** Credential containment
Target: Zero credential files written outside project-defined paths. Skill must not persist GCP credentials, Terraform state, or secrets to disk outside of paths already managed by the consuming project.

**NF4** Lint and format compliance
Target: 0 lint errors on merge. Skill code must pass existing Codevoyant lint and format checks (`pnpm format`, `pnpm lint`) without modification.

**NF5** Read-only operation idempotency
Target: Re-running read-only steps must produce identical output given identical inputs. Skill must be idempotent for read-only operations (mise task listing, Terraform plan, GHA workflow listing).

**NF6** Inline documentation coverage
Target: 100% of formalized patterns documented. All extracted patterns must include inline documentation (purpose, required inputs, expected outputs).

## Acceptance Criteria

- [ ] Running the skill's `help` sub-skill outputs a list of all available sub-skills with their required inputs
- [ ] Given a valid `mise.toml`, the skill can list all defined tasks and execute a named task, resolving declared task dependencies in the correct order
- [ ] All task patterns from mise-lib-templates are represented as callable skill steps; an audit checklist produced at project start confirms ≥80% coverage
- [ ] All GCP deployment patterns from mise-gcp-templates are represented as callable skill steps; the same audit checklist confirms ≥80% coverage
- [ ] The skill successfully runs `terraform init`, `terraform plan`, and `terraform apply` against a reference GCP project module from mise-gcp-templates in a sandbox environment
- [ ] The skill surfaces a structured plan diff (counts of resources to add, change, and destroy) before any `terraform apply` and aborts apply if diff capture fails
- [ ] The skill can author a GitHub Actions workflow YAML conforming to patterns from mise-gcp-templates, commit it, and trigger it via `gh workflow run`
- [ ] After triggering a GitHub Actions run, the skill polls until the run reaches a terminal state and returns pass/fail with a log excerpt on failure
- [ ] If a required environment variable is missing, the skill exits immediately with a structured error naming the missing variable before attempting any cloud API call
- [ ] A deployment summary artifact is written to the project directory on every successful end-to-end run
- [ ] The skill passes `pnpm lint` and `pnpm format` checks with zero errors
- [ ] No GCP credentials or Terraform state files are written outside project-defined paths during any skill run (verified by file-system diff before/after in sandbox)

## Open Questions

**Q1** Pattern audit scope
What is the exact list of patterns in mise-lib-templates and mise-gcp-templates to extract? A formal audit is needed to set the 80% coverage baseline.
Owner: Platform team | Due: 2026-04-04 (end of Week 5)

**Q2** Terraform destroy support
Should the skill support `terraform destroy` for teardown workflows, or is destroy always a manual operation in this iteration?
Owner: Platform team | Due: 2026-04-04

**Q3** Sandbox GCP project availability
Is there a sandbox GCP project available for acceptance testing, or does one need to be provisioned?
Owner: Platform team | Due: 2026-04-04

**Q4** Deployment summary artifact session ID format
What agent session ID format should the deployment summary artifact use to match existing Codevoyant audit conventions?
Owner: Platform team | Due: 2026-04-11

**Q5** GitHub Actions workflow authoring scope
Should GitHub Actions workflow authoring support only YAML generation, or also committing and opening a PR for review before triggering?
Owner: Platform team | Due: 2026-04-11

## Dependencies

- mise-lib-templates repository (source of task patterns to extract; read access required from project start)
- mise-gcp-templates repository (source of GCP deployment and GHA patterns; read access required from project start)
- Codevoyant core plugin framework (skill registration, help conventions, lint/format toolchain)
- GCP sandbox project with appropriate IAM permissions for Terraform acceptance tests
- `gh` CLI authenticated with GitHub Actions trigger permissions for acceptance tests
- Existing Codevoyant dev plugin (reference implementation for skill structure and testing conventions)
