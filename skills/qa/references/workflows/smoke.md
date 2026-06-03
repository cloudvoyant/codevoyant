# qa smoke workflow

## Step 0: Parse arguments

```
SOURCE        first non-flag arg — one of:
              - Linear issue URL (https://linear.app/...)
              - Plan name (.codevoyant/plans/{name}/plan.md)
              - Free-text prompt (anything else)
SLUG          --name slug  (optional; defaults to slugified source)
```

## Step 1: Resolve test objective

- **Linear URL**: fetch issue via `mcp__claude_ai_Linear__get_issue`, extract title + description as the test objective
- **Plan name**: read `.codevoyant/plans/{name}/plan.md` as the test objective
- **Free-text**: use as-is

`REPORT_DIR = .codevoyant/qa/{slug}/`

## Step 2: Load agent-browser skills

Before any browser commands, load the agent-browser core skill so instructions match the installed version:

```bash
agent-browser skills get core
```

If `agent-browser` is not installed, fall back to manual mode: print each test scenario and collect pass/fail via AskUserQuestion.

## Step 3: Plan smoke test scenarios

Based on the objective, derive 3–7 test scenarios. Each scenario has:
- Name
- Starting URL
- Actions to perform
- What to verify (expected outcome)

## Step 4: Authenticate (if required)

Inspect the starting URL. If it points to a protected route or the user's objective mentions needing to be logged in, ask:

```
AskUserQuestion:
  question: "Does this URL require authentication?"
  header: "Auth needed?"
  options:
    - label: "No — public URL"
    - label: "Yes — I have credentials"
    - label: "Yes — use my Chrome session"
    - label: "Yes — I have a saved auth state file"
```

### Option: No auth
Skip to Step 5.

### Option: Yes — use my Chrome session

Fastest path for OAuth/SSO/2FA. Ask the user to open Chrome with remote debugging:

```
Open Chrome with remote debugging enabled:

  # macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222

  # Linux
  google-chrome --remote-debugging-port=9222

Log in to the target site in that window, then confirm here.
```

After confirmation:

```bash
agent-browser --auto-connect state save {REPORT_DIR}/auth-state.json
agent-browser --session {slug} state load {REPORT_DIR}/auth-state.json
```

### Option: Yes — I have credentials

Ask for email and password via AskUserQuestion (Other field). Then perform the login flow:

```bash
agent-browser --session {slug} open {login-url}
agent-browser --session {slug} wait --load networkidle
agent-browser --session {slug} snapshot -i
# Identify @eN refs for email, password, submit
agent-browser --session {slug} fill @e{email-ref} "{EMAIL}"
agent-browser --session {slug} fill @e{password-ref} "{PASSWORD}"
agent-browser --session {slug} click @e{submit-ref}
agent-browser --session {slug} wait --load networkidle
```

If a 2FA prompt appears, ask the user for the OTP code, then:

```bash
agent-browser --session {slug} snapshot -i
agent-browser --session {slug} fill @e{otp-ref} "{OTP}"
agent-browser --session {slug} click @e{submit-ref}
agent-browser --session {slug} wait --load networkidle
```

Save state after successful login for reuse:

```bash
agent-browser --session {slug} state save {REPORT_DIR}/auth-state.json
```

### Option: Yes — I have a saved auth state file

Ask for the path to the state file, then:

```bash
agent-browser --session {slug} state load {STATE_FILE}
```

## Step 5: Run scenarios

Prepare output directories:

```bash
mkdir -p {REPORT_DIR}/screenshots
```

For each scenario, navigate and verify:

```bash
agent-browser --session {slug} open {scenario-url}
agent-browser --session {slug} wait --load networkidle
agent-browser --session {slug} snapshot
agent-browser --session {slug} screenshot {REPORT_DIR}/screenshots/{scenario-slug}.png
```

Use `snapshot -i` to interact with elements (buttons, forms):

```bash
agent-browser --session {slug} snapshot -i
agent-browser --session {slug} fill @e{ref} "{value}"
agent-browser --session {slug} click @e{ref}
agent-browser --session {slug} wait --load networkidle
agent-browser --session {slug} snapshot
```

Capture result (pass/fail + notes) for each scenario. A scenario fails if:
- The page redirects to login (session expired or auth failed)
- An error page, 4xx/5xx, or visible error message appears
- The expected element or content is absent from the snapshot

Check the console for errors after each scenario:

```bash
agent-browser --session {slug} console
agent-browser --session {slug} errors
```

## Step 6: Close session

```bash
agent-browser --session {slug} close
```

## Step 7: Write smoke report

Write `.codevoyant/qa/{slug}/smoke-report.md` using `references/templates/smoke-report.md`.

## Step 8: Report

```
✓ Smoke test complete: {passed}/{total} scenarios passed.
  Report: .codevoyant/qa/{slug}/smoke-report.md

  PASSED: {list}
  FAILED: {list}

To file a bug for any failure:
  /qa report {slug} --github
  /qa report {slug} --linear --team ENG
```
