# help

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

plan — Planning commands for Claude Code (renamed from em)

  /plan plan  [description|linear-url] [--level task|arch|project|initiative|product] [--delegate] [--continue <id>] [--push <slug>] [--bg] [--silent]
      Plan at task, project, initiative, or product level; drafts locally then pushes to Linear on confirmation.
      --level task: task/architecture-level plan with a task breakdown (routes to plan-task)
      --delegate: create PM/UX/dev stub issues instead of full breakdown
      --continue <id>: resume from existing Linear project state
      --push <slug>: re-push a saved local plan to Linear

  /plan review  [plan-file] [--silent]
      Review a plan for capacity realism, dependency gaps, and phasing quality

  /plan update  [plan-slug] [change description] [--bg] [--silent]
      Update a plan by applying annotations or describing changes conversationally

  /plan approve  [plan-slug] [--push [project-url]] [--silent]
      Promote a draft plan to docs/ and optionally sync to Linear (issues for task-level plans, milestones for project/initiative plans)

  /plan allow  [--global]
      Pre-approve plan skill permissions for uninterrupted agent execution
