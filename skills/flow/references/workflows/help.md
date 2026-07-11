# Workflow: flow help

Print usage reference for the `flow` skill.

## Output

```
flow — chain skill commands into a named, reusable pipeline

  /flow new <name> [steps...] [--global]   — define a new flow
  /flow go <name> [input] [--set k=v] [--global]
                                           — run pending steps sequentially
  /flow list [--global | --local]          — list all flows (local + global)
  /flow status <name> [--global]           — show checklist state
  /flow doctor [name] [--fix] [--global]   — diagnose (or --fix repair) broken flows
  /flow save <name> --skill <s> [--global] — turn a flow into a reusable skill
  /flow help                               — this message

Verb aliases:
  run, exec, start   →  go
  ls                 →  list
  show, review       →  status
  fix, diagnose, check →  doctor
  export, publish    →  save

Storage:
  local  (default)   .codevoyant/flows/<slug>/       — this project only
  global (--global)  ~/.codevoyant/flows/<slug>/      — reusable across all projects

Forwarding flags to steps:
  Any flag other than --global/-g (and --set for `go`) is forwarded to every step
  command — e.g. run a flow's steps on a branch:
    /flow new ship "/spec new {{input}}" "/spec go" --branch feature/x   (bakes it in)
    /flow go ship "add OAuth" --branch feature/x                          (one-off run)

Definitions vs. run instances:
  A flow's directory is a read-only DEFINITION (steps + implementations). Running a
  flow never mutates it — progress + context for a run live in a local RUN INSTANCE:
    .codevoyant/runs/<slug>/  (run.md + progress.md + context.md)
  so a global flow stays a pristine template and concurrent runs never clobber each
  other. /flow status reads the run instance; /flow doctor cleans up when they don't.

Parameters (dynamic input):
  Put {{placeholders}} in any step. At run time:
    • bare text after the name binds to {{input}}
    • --set key=value binds a named {{key}}
    • anything still unset is prompted for once
  Outputs from each step (PR numbers, plan names, paths) are captured and
  threaded forward as "flow context" so later steps can use them automatically
  (persisted, so an interrupted flow resumes with it).

Chaining interactive skills:
  Steps run as subagents and can't prompt you, so write them non-interactively —
  pass input inline / as {{params}} (distinct params for steps needing different
  values), and point a consumer step at the artifact its producer wrote. If a step
  still can't decide, it escalates one question (NEEDS_INPUT) and re-runs with your answer.

Example — a global, parameterized ship pipeline:
  /flow new ship \
    "/spec new {{input}}" \
    "/spec go" \
    "/git commit" \
    "/pr open" \
    "/pr address" \
    "/git commit --fix" \
    --global

  /flow go ship "add OAuth login to settings"
  /flow list
  /flow status ship --global
```

Print the above message verbatim.
