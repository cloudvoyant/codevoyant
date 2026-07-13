# Code-Completeness Blocklist

Canonical list of placeholder/stub markers that make a task's `**Code:**` block incomplete. This is the single source of truth — `validation-prompt.md`, `implementation-template.md`, and `agents/spec-planner.md` all reference this file rather than restating the list, so the gate stays consistent.

## Blocked markers

A code block is REJECTED if it contains any of:

- Elisions: `...`, `…`
- Task markers: `TODO`, `FIXME`
- Placeholders: `<placeholder>`, `// implement`, `# implement`, `pass  # stub`, `raise NotImplementedError`
- Vague-reference phrases: "e.g.", "something like", "similar to", "same as above", "rest unchanged", "and so on"

It is also rejected if it is missing or empty where the task writes or edits a file, shows only a signature/comment where a body belongs, or describes the code in prose instead of showing the literal lines.

## Intent, not blind substring matching

These markers are heuristics for *placeholder* content, not banned tokens. Judge intent: a code block is only incomplete if the marker stands in for code the author declined to write. Legitimate code may contain some of these substrings for real reasons — a `...` spread/rest operator in JS/TS/Python, or a string literal or comment that genuinely contains `e.g.` or `TODO` referencing an external tracker. Do not fail complete, working code that merely happens to contain one of these substrings. When the token is a real part of the code (not a stand-in for missing work), the block passes.
