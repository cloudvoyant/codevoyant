# Step {N}: {step-command}

## Flow context

Flow: {flow-name}
Step: {N} of {total}

## Parameters

<!-- Resolved run-time values substituted before this step runs. Empty if the flow has no parameters. -->
{param-name} = {resolved-value}

## Flow context so far

<!--
Injected by `/flow go` at run time: a short, accumulating log of what earlier steps
produced (IDs, URLs, file paths, plan/branch names). Empty for step 1.
-->
{prior-step-handoffs, or "(nothing yet — this is the first step)"}

## Agent prompt

You are executing step {N} of the "{flow-name}" flow, running as a **subagent**. You CANNOT prompt the user — `AskUserQuestion` does not reach them from here.

Your task: {step-command}

**Inputs — use what the flow already gave you.** Treat the **Parameters** and **Flow context so far** above as ground truth: a PR number, plan name, branch, or file path there was produced by an earlier step or supplied by the user. Prefer them over asking or guessing. If the Flow context names an **artifact** a prior step produced (an exploration directory, a plan, a doc), **consume it** — do not start that work over. (E.g. if a prior `/dev explore` wrote `.codevoyant/explore/{slug}/`, point this step's skill at that exploration instead of re-researching.)

**Run the skill non-interactively.** Follow all rules of the skill, but pass inputs inline so it never stops to ask. Do NOT call `AskUserQuestion` — it will not reach the user.

**If you truly cannot proceed** — a decision is required that Parameters and Flow context don't cover and that has no safe, clearly-stated default — do NOT guess and do NOT block. Stop and end your report with exactly one line:

```
NEEDS_INPUT: {the single question the user must answer}
```

The flow (running on the main thread) will ask the user and re-run you with the answer added to Parameters. Use this sparingly — only for a decision that would change the outcome.

When you finish successfully, end your report with a single handoff line listing any values later steps may need — IDs, URLs, paths, names, **and any artifact paths you created** — so the flow can thread them forward:

```
HANDOFF: {key=value; key=value; ...}   (or "HANDOFF: none" if nothing to pass on)
```
