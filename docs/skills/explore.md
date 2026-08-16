# explore

Pure technical exploration: research a problem space, compare technical approaches or repositories, and generate decision-oriented proposals. This skill never writes application code.

## Workflows

### new — research technical approaches

Research a technical problem and generate parallel proposals before building. Output lives in `.codevoyant/explore/{slug}/` and can feed into `/spec new`.

```bash
/explore new "caching strategy"                # research approaches, generate proposals
/explore new "auth approaches" --aspects       # break down by aspect
/explore new how the auth middleware works     # topic inline
```

### diff — compare repos or branches

Generate a diff report covering structural differences, added/removed files, and architectural divergence between your codebase and another repository or branch.

```bash
/explore diff https://github.com/org/other-repo    # compare with a remote repository
/explore diff feature/my-branch                    # compare with a local branch
```

Output is written to `.codevoyant/diffs/{YYYY-MM-DD}-{target-repo-name}.md`.

### allow — pre-approve permissions

Write the allow entries needed for the explore skill to run without permission prompts.

```bash
/explore allow                                # write to project .claude/settings.json
/explore allow --global                       # write to ~/.claude/settings.json
```

### help — list commands

```bash
/explore help                                 # list all explore commands with descriptions
```

> Renamed from `dev`. The old `/dev plan` and `/dev approve` workflows moved to the `plan` skill (`/plan plan`, `/plan approve`); `/dev docs` moved to the `docs` skill (`/docs new`, `/docs update`, `/docs retcon`).
