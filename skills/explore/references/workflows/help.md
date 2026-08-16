# help

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

explore — Technical exploration commands for Claude Code

  /explore new  [topic] [--deep] [--aspects]
      Research a technical problem, compare architectural approaches, and generate parallel proposals

  /explore diff  <repository-url>
      Compare the current repository with another to identify structural differences and insights

  /explore allow  [--global]
      Pre-approve explore skill permissions for uninterrupted autonomous agent execution

Planning, approval, and docs generation moved out of this skill:

  /explore plan     → /plan plan  (task/architecture-level planning in the plan skill)
  /explore approve  → /plan approve
  /explore docs     → /docs new | /docs update | /docs retcon
