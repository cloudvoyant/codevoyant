# Terraform mise Tasks

Standard mise task wrappers for Terraform operations based on nv-gcp-template.

## Task Reference

| Task | Description |
|---|---|
| `tf-init <workspace>` | Init backend + select/create workspace |
| `tf-plan <workspace>` | Plan changes for a workspace |
| `tf-apply <workspace>` | Apply changes to a workspace |
| `tf-destroy <workspace>` | Destroy infrastructure in a workspace |
| `tf-init-shared` | Init shared infrastructure backend |
| `tf-plan-shared` | Plan shared infrastructure changes |
| `tf-apply-shared` | Apply shared infrastructure |
| `tf-destroy-shared` | Destroy shared infrastructure |
| `tf-create-backend` | Create the GCS backend bucket (run once) |

## Usage

```bash
mise run tf-init dev
mise run tf-plan dev
mise run tf-apply dev

mise run tf-init prod
mise run tf-apply prod     # CI sets TF_VAR_app_image before this

mise run tf-apply-shared   # one-time shared resources
```

`tf-plan` and `tf-apply` call `tf-init` via `depends` — no need to run it manually first in most cases.

## Workspace Inference

If no workspace argument is provided, tasks infer the workspace from the git branch:

- `main` → `prod`
- `stage` → `stage`
- `issue/123-*` → `preview-123`
- anything else → `dev`

## mise.toml Setup

```toml
[tools]
terraform = "1"    # major-pinned

[task_config]
includes = ["mise-tasks"]

[settings]
experimental = true
```

Terraform tasks live in `mise-tasks/` as shell scripts with `#MISE description="..."` headers.

## CI Pattern

```bash
# In CI after docker push:
TF_VAR_app_image="${REGISTRY}/${PROJECT}-web:${VERSION}" \
  mise run tf-apply prod
```

The `app_image` var is injected via environment — never passed as a `-var` flag that would appear in CI logs.
