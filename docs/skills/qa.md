# qa

Structured bug investigation, browser-agent smoke tests, and one-command issue filing to GitHub, GitLab, or Linear.

## Requirements

- `npx @vercel/agent-browser` — required for the `smoke` verb

## Commands

### debug — Investigate a bug

Investigate a bug in the codebase and write a structured debug report.

```bash
/qa debug login-crash                            # investigate by slug
/qa debug login-crash --desc "Crashes on OAuth" # provide a description to seed the investigation
```

Aliases: `/qa investigate`.

### smoke — Run a smoke test

Run a browser-agent smoke test against a URL, Linear issue, or free-text objective and write a smoke report.

```bash
/qa smoke https://myapp.com/checkout             # smoke test a URL
/qa smoke https://linear.app/team/issue/ENG-42   # smoke test a Linear issue
/qa smoke "checkout flow on slow networks"        # free-text objective
```

Aliases: `/qa test`, `/qa browse`.

### report — File a report as an issue

Post an existing QA report (debug or smoke) as an issue to GitHub, GitLab, or Linear.

```bash
/qa report login-crash --github                  # post to GitHub
/qa report login-crash --gitlab                  # post to GitLab
/qa report login-crash --linear --team ENG       # post to Linear
```

Aliases: `/qa file`, `/qa post`.
