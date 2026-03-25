# help

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

pm — Product management planning commands for Claude Code

  /pm explore  [topic] [--bg] [--silent]
      Research a product topic or feature area. Deposits research artifact to
      .codevoyant/research/{slug}.md for use by pm plan and pm prd.

  /pm plan  [quarter|half|annual] [--bg] [--silent]
      Draft a product roadmap using capability tiers. Writes draft to
      .codevoyant/roadmaps/. Use /pm approve to commit to docs/.

  /pm update  [roadmap-slug] [change description]
      Update a draft roadmap in .codevoyant/roadmaps/.
      For committed roadmaps, re-draft with pm plan then re-approve.

  /pm approve  [roadmap-slug] [--push [initiative-url]] [--silent]
      Promote a draft roadmap to docs/product/roadmaps/.
      Runs pm review first. Optionally pushes roadmap to a Linear initiative
      (new or existing). Research artifacts become Linear documents.

  /pm prd  [feature-slug|linear-url] [--bg] [--silent]
      Write a single PRD. Consumes pm explore research if available.
      Writes to docs/product/prds/YYMMDD-{slug}-prd.md.

  /pm review  [roadmap-path] [--silent]
      Review a roadmap for prioritization, capability quality, and strategic coherence.
      Auto-launched by pm plan and pm approve.

  /pm allow  [--global]
      Pre-approve pm plugin permissions for uninterrupted agent execution.
