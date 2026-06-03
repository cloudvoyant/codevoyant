---
title: mise
---

# mise

Context skill for `mise.toml` authoring and task conventions — activates automatically, no slash command needed.

## Requirements

- `mise` — [mise installation](https://mise.jdx.dev/getting-started.html)

## Commands

This is a context skill. It activates automatically when `mise.toml` or `.mise.toml` is detected. No slash command is needed.

### Trigger conditions

The skill loads when any of the following are present:

- `mise.toml` or `.mise.toml` in the project root
- User mentions mise, mise tasks, `mise run`, or `mise install`
- A `mise-tasks/` directory is present

### Recipes available

| Situation | Recipe loaded |
|---|---|
| Task naming conventions and standard task set | `task-naming` |
| TypeScript and pnpm project (single or monorepo) | `ts-pnpm` |
| SvelteKit project | `sveltekit` |
| Zig project | `zig` |
| C++ project with Conan package manager | `cpp-conan` |
| Docker tasks, dev containers, WSL or Linux or Mac compat | `docker` |
| Terraform tasks for GCP (tf-init, tf-plan, tf-apply) | `terraform-gcp` |
| Terraform tasks for AWS (tf-init, tf-plan, tf-apply) | `terraform-aws` |

Each recipe loads on demand — only what is relevant to the current task.

## References

- [mise documentation](https://mise.jdx.dev/)
- [mise tasks reference](https://mise.jdx.dev/task/)
