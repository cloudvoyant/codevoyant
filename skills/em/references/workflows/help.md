# help

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

em — Engineering management planning commands for Claude Code

  /em plan  [description|linear-url] [--delegate] [--continue <id>] [--push <slug>] [--bg] [--silent]
      Plan a project or initiative locally then push to Linear on confirmation.
      --delegate: create PM/UX/dev stub issues instead of full breakdown
      --continue <id>: resume from existing Linear project state
      --push <slug>: re-push a saved local plan to Linear

  /em review  [roadmap-file] [--silent]
      Review an engineering roadmap or epic plan for capacity realism, dependency gaps, and phasing quality

  /em update  [plan-slug] [change description] [--bg] [--silent]
      Update an EM plan by applying annotations or describing changes conversationally

  /em approve  [plan-slug] [--push [project-url]] [--silent]
      Promote a draft engineering plan to docs/engineering/plans/ and optionally sync to Linear

  /em allow  [--global]
      Pre-approve em plugin permissions for uninterrupted agent execution
