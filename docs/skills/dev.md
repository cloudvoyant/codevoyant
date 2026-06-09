# dev

Developer workflows for architecture planning, technical exploration, repo comparison, docs generation, and Linear integration.

## Workflows

### diff — compare repos or branches

Generate a diff report covering structural differences, added/removed files, and architectural divergence between your codebase and another repository or branch.

```bash
/dev diff https://github.com/org/other-repo    # compare with a remote repository
/dev diff feature/my-branch                    # compare with a local branch
```

Output is written to `.claude/diff.md`.

### explore — research technical approaches

Research a technical problem and generate parallel proposals before building.

```bash
/dev explore "caching strategy"                # research approaches, generate proposals
/dev explore "auth approaches" --aspects       # break down by aspect
```

Output lives in `.codevoyant/explore/{slug}/` and can feed into `/spec new`.

### plan — draft an architecture plan

Plan feature architecture or system design and write a draft to `.codevoyant/plans/{slug}/plan.md`.

```bash
/dev plan "authentication system"              # feature design doc
/dev plan "auth" --mode arch                   # architecture plan with task breakdown and LOE
/dev plan "auth" --mode arch --bg              # run in background
```

`--mode arch` produces a task breakdown with LOE estimates, blocking relationships, and acceptance criteria. Use `/dev approve` to promote the plan to `docs/architecture/`.

### docs — generate architecture documentation

> **Moved to `docs` skill.** Use `/docs new`, `/docs update`, `/docs review`, or `/docs retcon` instead.
> See [`/skills/docs`](/skills/docs) for the full command reference.

### approve — promote plan to docs and Linear

Promote a draft architecture plan to `docs/architecture/` and optionally create Linear tasks.

```bash
/dev approve                                        # approve most recent dev plan draft
/dev approve my-plan                                # approve specific plan by slug
/dev approve my-plan --push                         # approve and create new Linear project with tasks
/dev approve my-plan --push https://linear.app/...  # approve and push to existing Linear project
/dev approve my-plan --silent                       # suppress notification
```

### allow — pre-approve permissions

Write the allow entries needed for dev and git skills to run without permission prompts.

```bash
/dev allow                                     # write to project .claude/settings.json
/dev allow --global                            # write to ~/.claude/settings.json
```

### help — list commands

```bash
/dev help                                      # list all dev commands with descriptions
/dev help diff                                 # show full details for a specific command
```
