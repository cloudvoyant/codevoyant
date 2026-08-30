# security-gates — the deterministic floor for /pr review

Review's machine-backed layer: the project's own tooling first, then free industry-standard static tools (no subscriptions, local runs only). Detection is opportunistic — a missing tool is reported as a skip in the review's Verification section, never a failure and never silently ignored. Pin one version per tool so "clean" means the same thing on every run.

## Project tooling (run first)

Detect the project's task runner (`mise.toml` / `justfile` / `Makefile` / `package.json` scripts) and run its **format check**, **lint**, and **typecheck** recipes when they exist — the same recipes the git-commit workflow runs. Violations become `Quality:` findings anchored to the offending files. No task runner or no recipe → skip (recorded in Verification).

## Static floor (free tools, pinned)

| Tool | Purpose | Install (opportunistic) | License |
| --- | --- | --- | --- |
| semgrep `1.99.0` | SAST patterns across languages | `pipx install semgrep==1.99.0` or `pip install semgrep==1.99.0` | LGPL-2.1 (OSS engine) |
| bandit `1.8.3` | Python AST security scan | `pipx install bandit==1.8.3` | Apache-2.0 |
| trufflehog `3.88.2` | secret discovery (800+ types, live validation) | `brew install trufflehog` or `pipx install trufflehog==3.88.2` | AGPL-3.0 |

Run only what the diff's languages need (bandit only when Python files changed; semgrep with `--config auto` scoped to changed files; trufflehog on the branch range `main..HEAD` — or the PR base — filesystem mode). Raw findings go to the `security-curator` step in review.md: it filters false positives, adds CWE/STRIDE tags, and never invents findings the tools did not produce. Secrets are trufflehog's job — the LLM passes only look for secret-like patterns the detectors miss.

## Rules

- Never block review on a missing tool — record the skip in the Verification section.
- Never let an LLM pass claim a scanner's output — tool findings are attributed to the tool.
- Static findings the curator cannot verify downgrade to NOTE (transparent, not dropped).
- Track AGPL-3.0 (trufflehog) for distribution contexts that restrict it.
