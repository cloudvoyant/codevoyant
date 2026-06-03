# qa help

```
/qa debug <slug> [--desc "..."]
    Investigate a bug and write a structured report to .codevoyant/qa/{slug}/debug-report.md

/qa smoke <source> [--name slug]
    Run a browser-agent smoke test. Source can be:
      - Linear issue URL:  /qa smoke https://linear.app/team/issue/ENG-123
      - Plan name:         /qa smoke my-feature
      - Free-text prompt:  /qa smoke "test the login flow on mobile"

/qa report <slug> [--github] [--gitlab] [--linear --team KEY] [--repo R]
    Post an existing QA report as an issue to one or more trackers.
    Multiple trackers can be specified together.

Examples:
  /qa debug login-crash --desc "App crashes on login with Google OAuth"
  /qa smoke https://linear.app/myteam/issue/ENG-42
  /qa smoke my-feature --name feature-smoke-1
  /qa report login-crash --github --linear --team ENG
```
