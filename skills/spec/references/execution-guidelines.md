# Execution Guidelines

These rules MUST be followed by any agent executing this plan (go, bg).

## Best Practices for Tasks

- **Terse but Clear**: Tasks should be concise one-liners
- **Actionable**: Each task should be a specific action, not a vague goal
- **Ordered**: Tasks within phases should follow logical dependencies
- **Grouped**: Related tasks should be in the same phase
- **Progressive**: Phases should build on each other when possible

## Constraints

**Brevity and minimal changes:**
- Make the smallest change that achieves the goal — no drive-by refactors, no formatting passes on unrelated files, no "while I'm here" improvements
- If something unrelated is broken or ugly, note it in a comment or TODO; do not fix it
- Prefer editing existing files over creating new ones
- Prefer adding to existing abstractions over introducing new ones

**Build system preservation (CRITICAL):**
- If the project builds before you start, it must build after every task — do not break the build even temporarily
- Do NOT modify the build system (`justfile`, `Makefile`, `taskfile.yml`, `package.json` scripts, `mise.toml`, CI config, etc.) unless the plan explicitly requires it or the task is specifically about the build system itself
- Do NOT add, remove, or upgrade dependencies unless the plan explicitly requires it
- If a task would require a build system change to complete correctly, stop and flag it rather than modifying the build system unilaterally
