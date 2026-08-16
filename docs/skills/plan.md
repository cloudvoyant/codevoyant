# plan

Planning at every level — a single task, a project, an initiative, or a whole product — with milestone-grouped task plans, roadmap review, and Linear integration. Renamed from `em`.

## Workflows

### plan — plan at any level

Produce a plan in `.codevoyant/plans/{slug}/`; use `/plan approve` to promote it to `docs/` (task/architecture-level plans to `docs/architecture/`, project/initiative-level plans to `docs/engineering/plans/`).

```bash
/plan plan "migrate auth to OAuth2"                      # project-level plan (default)
/plan plan "auth system" --level task                    # task/architecture-level plan with task breakdown
/plan plan https://linear.app/team/project/PRJ-123       # seed from existing Linear project
/plan plan https://linear.app/team/initiative/INIT-1     # seed from a Linear initiative
```

The level is auto-detected from a Linear URL (`/issue/` → task, `/project/` → project, `/initiative/` → initiative). Task/architecture-level planning produces a task breakdown with LOE and acceptance criteria; project/initiative/product planning produces milestone-grouped task files.

### approve — promote plan and push to Linear

Promote a draft plan to docs and sync to Linear: task-level plans create Linear issues; project/initiative-level plans create a Linear project with milestones.

```bash
/plan approve                                            # approve most recent plan draft
/plan approve my-plan                                    # approve specific plan by slug
/plan approve my-plan --push                             # approve and create new Linear project
/plan approve my-plan --push https://linear.app/...      # approve and push to existing project
```

### review — review plan quality

Check capacity realism, dependency gaps, missing risks, and phasing quality; auto-launched after `/plan plan` completes.

```bash
/plan review                                             # auto-selects most recent plan
/plan review my-plan                                     # review specific plan
/plan review my-plan --silent                            # suppress output
```

### update — apply plan changes

Apply inline annotations or conversational changes to plan files.

```bash
/plan update my-plan "add error handling milestone"      # conversational change
/plan update my-plan --bg                                # apply annotations in background
```

Supports `<!-- > instruction -->` (block-level) and `content <!-- >> instruction -->` (line-level) annotation forms.

### allow — pre-approve permissions

Write the allow entries needed for plan skills to run without permission prompts.

```bash
/plan allow                                              # write to project .claude/settings.json
/plan allow --global                                     # write to ~/.claude/settings.json
```

### help — list commands

```bash
/plan help                                               # list all plan commands
```

> Renamed from `em`. Task/architecture-level planning (formerly `/dev plan`, `/dev approve`) moved here from the `explore` skill.
