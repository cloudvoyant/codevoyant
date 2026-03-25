# help

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

dev — Development workflow commands for Claude Code

  /dev plan  [feature-name] [--mode arch|feat] [--bg] [--silent]
      Plan architecture for a project or feature. Writes to docs/architecture/.

  /dev explore  [exploration-name] [--deep] [--aspects]
      Research a technical problem, compare architectural approaches, and generate parallel proposals

  /dev diff  <repository-url>
      Compare the current repository with another to identify structural differences and insights

  /dev docs  [--bg] [--silent]
      Generate or update architecture documentation in docs/architecture/ from a codebase scan

  /dev approve  [plan-slug] [--push [linear-project-url]] [--silent]
      Promote a draft architecture plan and optionally push tasks to Linear

  /dev mr  [base-branch] [--github|--gitlab] [--draft] [--yes|-y]
      Create a pull request (GitHub) or merge request (GitLab) into base-branch (default: main)

  /dev pr-fix  [pr-id] [--github|--gitlab] [--silent]
      Fetch open PR/MR change requests and propose fixes

  /dev allow  [--global]
      Pre-approve dev plugin permissions for uninterrupted autonomous agent execution

Git commands have moved to `/git`:

  /git commit  [--yes|-y] [--no-push] [--autofix] [--atomic] [--single]
  /git ci  [--wait] [--autofix] [--silent]
  /git rebase  [base-branch] [--push]
