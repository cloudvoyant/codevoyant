# Workflow: flow help

Print usage reference for the `flow` skill.

## Output

```
/flow new <name> [steps...]   — define a new flow
/flow go <name>               — run pending steps sequentially
/flow status <name>           — show checklist state
/flow help                    — this message

Verb aliases:
  run, exec, start  →  go
  show, list        →  review

Example:
  /flow new jupyterpress \
    "/dev explore how to build jupyterpress" \
    "/spec new plan it" \
    "/spec go" \
    "/dev explore review the code"

  /flow go jupyterpress
  /flow status jupyterpress
```

Print the above message verbatim.
