# pm

Product management workflows for roadmap planning, PRD writing, product area research, prioritization review, and Linear integration.

## Workflows

### explore — research a product area

Run parallel research agents and deposit a summary artifact to `.codevoyant/explore/{slug}/summary.md` for use by `/pm plan` and `/pm prd`.

```bash
/pm explore "user onboarding"                          # research and generate artifact
/pm explore "pricing strategy" --bg                    # run in background
```

### plan — draft a product roadmap

Produce a phased roadmap with feature prioritization in `.codevoyant/roadmaps/`; `pm review` launches automatically in the background on completion.

```bash
/pm plan quarter                                       # quarterly product roadmap
/pm plan half                                          # half-year roadmap
/pm plan annual                                        # annual roadmap
```

Use `/pm approve` to promote to `docs/product/roadmaps/`.

### prd — write a PRD

Write a structured Product Requirements Document to `docs/prd/` with problem statement, goals, requirements tables, acceptance criteria, and non-goals.

```bash
/pm prd "user authentication"                          # standalone PRD from description
/pm prd https://linear.app/team/issue/ENG-42           # seed from a Linear issue
```

### approve — promote roadmap and push to Linear

Copy the full roadmap into a Linear initiative description and attach research artifacts as Linear documents.

```bash
/pm approve                                            # approve most recent pm plan draft
/pm approve my-roadmap                                 # approve specific roadmap by slug
/pm approve my-roadmap --push                          # approve and create new Linear initiative
/pm approve my-roadmap --push https://linear.app/...   # approve and push to existing initiative
```

### review — review roadmap quality

Check coverage gaps, prioritization quality, missing PRDs, and strategic coherence.

```bash
/pm review                                             # auto-selects most recent plan
/pm review my-roadmap                                  # review specific plan
/pm review my-roadmap --silent                         # suppress output
```

### update — apply plan changes

Apply inline annotations or conversational changes to roadmap and PRD files.

```bash
/pm update my-plan "add mobile support feature"        # conversational change
/pm update my-plan --bg                                # apply annotations in background
```

### allow — pre-approve permissions

Write the allow entries needed for pm skills to run without permission prompts.

```bash
/pm allow                                              # write to project .claude/settings.json
/pm allow --global                                     # write to ~/.claude/settings.json
```

### help — list commands

```bash
/pm help                                               # list all pm commands
```
