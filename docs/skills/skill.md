# skill

Lifecycle management for building, improving, and maintaining codevoyant-compatible skills.

## Requirements

- `npx` — required for scaffolding operations

## Commands

### explore — Research existing skills

Search agentskill.sh and known registries for existing skills before building something new.

```bash
/skill explore                          # open-ended research
/skill explore "linear integration"     # targeted search
```

### new — Scaffold a new skill

Create a new skill directory from a description, including SKILL.md and workflow stubs.

```bash
/skill new                              # guided prompts
/skill new my-command                   # named, proceeds immediately
/skill new add a /summarize command that condenses long files
```

Aliases: `/skill create`.

### learn — Extract a skill from an artifact

Read a local path, URL, or PR/MR diff and extract discrete workflows into a new skill.

```bash
/skill learn skills/gh/                              # extract from existing skill directory
/skill learn https://docs.example.com/api            # extract from a webpage
/skill learn https://github.com/org/repo/pull/42     # extract from a PR diff
/skill learn "watch a file and notify on change"     # extract from a text goal
/skill learn skills/gh/ --name my-gh                 # override output skill name
```

### consolidate — Merge two skills

Merge two skills into one, deduplicating workflows and surfacing conflicts for resolution.

```bash
/skill consolidate skills/gh/ skills/glab/                   # merge two local skills
/skill consolidate skills/gh/ skills/glab/ --name vcs        # set the output name
/skill consolidate https://example.com/skill-a skills/gh/    # mix URL and local
```

### update — Refine an existing skill

Read and improve an existing skill's workflows or SKILL.md.

```bash
/skill update my-skill                              # targeted update
/skill update my-skill add a --dry-run flag to the deploy verb
```

Aliases: `/skill improve`.

### critique — Evaluate skill quality

Review a skill across five dimensions: trigger accuracy, workflow clarity, argument handling, error paths, and output consistency.

```bash
/skill critique my-skill
```

Aliases: `/skill review`.

### scaffold — Initialise a skill repo

Set up a new skill repository with annotated example skills and the standard directory structure.

```bash
/skill scaffold my-org/my-skills-repo
```

Aliases: `/skill init`, `/skill bootstrap`.

### feedback — Report a skill problem

Open a GitHub or GitLab issue to report a problem with a codevoyant skill.

```bash
/skill feedback                         # guided — asks which skill and what went wrong
/skill feedback spec                    # report a problem with the spec skill
/skill feedback spec --save             # save to .codevoyant/feedback/ instead of opening an issue
```
