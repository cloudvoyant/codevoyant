# em

Engineering management workflows for project planning, milestone-grouped task breakdowns, roadmap review, and Linear integration.

## Workflows

### plan — draft an engineering project plan

Produce a local milestone-grouped task plan in `.codevoyant/plans/{slug}/`; use `/em approve` to promote it to `docs/engineering/plans/`.

```bash
/em plan "migrate auth to OAuth2"                      # draft plan from description
/em plan https://linear.app/team/project/PRJ-123       # seed from existing Linear project
/em plan --continue PRJ-123                            # resume from existing Linear state
```

### approve — promote plan and push to Linear

Promote a draft plan to `docs/engineering/plans/`, set start/end dates on the Linear project, and create milestones from the plan's milestone headings.

```bash
/em approve                                            # approve most recent em plan draft
/em approve my-plan                                    # approve specific plan by slug
/em approve my-plan --push                             # approve and create new Linear project
/em approve my-plan --push https://linear.app/...      # approve and push to existing project
```

Issue creation is handled separately by `dev:plan`, not by `em approve`.

### review — review roadmap quality

Check capacity realism, dependency gaps, missing risks, and phasing quality; auto-launched after `/em plan` completes.

```bash
/em review                                             # auto-selects most recent plan
/em review my-roadmap                                  # review specific plan
/em review my-roadmap --silent                         # suppress output
```

### update — apply plan changes

Apply inline annotations or conversational changes to plan files.

```bash
/em update my-plan "add error handling milestone"      # conversational change
/em update my-plan --bg                                # apply annotations in background
```

Supports `<!-- > instruction -->` (block-level) and `content <!-- >> instruction -->` (line-level) annotation forms.

### allow — pre-approve permissions

Write the allow entries needed for em skills to run without permission prompts.

```bash
/em allow                                              # write to project .claude/settings.json
/em allow --global                                     # write to ~/.claude/settings.json
```

### help — list commands

```bash
/em help                                               # list all em commands
```
