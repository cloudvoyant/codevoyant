/linear report-issue [--team KEY] [--project ID] [--title "..."] [--priority 1-4] [--from <report-path>]

  --team KEY        Linear team key (e.g. ENG, PLAT). Required unless --project given.
  --project ID      Optional: link issue to a Linear project.
  --title "..."     Issue title. Prompted if not given.
  --priority 1-4    1=Urgent, 2=High, 3=Medium (default), 4=Low.
  --from <path>     Read fields from a .codevoyant/qa debug or smoke report.

Aliases: /linear report, /linear bug, /linear issue

Examples:
  /linear report-issue --team ENG --title "Login crashes on Safari"
  /linear report-issue --from .codevoyant/qa/login-crash/debug-report.md --team ENG
