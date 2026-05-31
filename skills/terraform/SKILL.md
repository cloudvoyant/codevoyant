---
name: terraform
description: "Terraform authoring patterns — directory structure, backend config, workspace-per-environment, variable management, and mise task wrappers for GCP and AWS. Load when writing .tf files, configuring backends, managing workspaces, or running tf-init/tf-plan/tf-apply tasks."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# terraform

Patterns for structuring and maintaining Terraform configurations. Core conventions are cloud-agnostic; cloud-specific recipes cover GCP (nv-gcp-template) and AWS.

## When to load recipes

| You are working on… | Load recipe |
|---|---|
| Directory structure and module layout | `references/recipes/structure.md` |
| GCP backend (GCS) and workspace management | `references/recipes/gcp-backend-workspaces.md` |
| GCP variable and tfvars management | `references/recipes/gcp-variables.md` |
| AWS backend (S3) and workspace management | `references/recipes/aws-backend-workspaces.md` |
| AWS variable and provider setup | `references/recipes/aws-variables.md` |

For mise task wrappers (`tf-init`, `tf-plan`, `tf-apply`, `tf-destroy`) see the `mise` skill — recipes `terraform-gcp` and `terraform-aws`.

## Core Conventions

- Infrastructure lives in `infra/` at the repo root
- Split into `infra/shared/` (one-time shared resources) and `infra/environments/` (per-workspace deployments)
- Environments map to Terraform workspaces: `dev`, `stage`, `prod`, `preview-*`
- Variables passed via `-var` flags in mise tasks — never via committed `terraform.tfvars`
- Secrets injected at deploy time via `TF_VAR_*` env vars (CI) or cloud-native secret stores (runtime)
- Provider pinned with `required_providers` in `versions.tf`; Terraform version pinned to major in `mise.toml`
- Backends created via idempotent mise tasks with delete protection enabled — never created manually

## Directory Structure

```
infra/
  shared/                    ← one-time shared resources (CDN, registry, IAM)
    main.tf
    variables.tf
    outputs.tf
    providers.tf
    backend.tf
    versions.tf
    terraform.tfvars.example ← gitignored tfvars go alongside (never committed)

  environments/              ← per-environment resources (Cloud Run, storage, secrets)
    main.tf
    variables.tf
    outputs.tf
    providers.tf
    backend.tf
    versions.tf

  modules/                   ← reusable modules
    cdn/
    storage-bucket/
    nv-fullstack-app/
```

## Backend

GCS backend with workspace support:

```hcl
# infra/environments/backend.tf
terraform {
  backend "gcs" {
    # Bucket and prefix passed via -backend-config during tf-init
    # State paths:
    #   ${GCP_PROJECT_ID}/${PROJECT}/env:/dev/default.tfstate
    #   ${GCP_PROJECT_ID}/${PROJECT}/env:/stage/default.tfstate
  }
}
```

Never hardcode the bucket name — it's passed by `mise run tf-init`.

## Variables

Standard variable set for GCP environments:

```hcl
variable "project"                       { type = string }
variable "gcp_project_id"               { type = string }
variable "gcp_region"                   { type = string }
variable "environment_name"             { type = string }  # dev | stage | prod | preview-*
variable "app_image"                    { type = string; default = "" }  # set via TF_VAR_app_image in CI
variable "gcp_devops_project_id"        { type = string }
variable "gcp_devops_docker_registry_name" { type = string }
```

`app_image` defaults to empty — CI sets `TF_VAR_app_image` to the built image tag.

## Provider

```hcl
# infra/environments/providers.tf
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region

  default_labels = {
    project     = var.project
    environment = var.environment_name
    managed_by  = "terraform"
  }
}
```

Always set `default_labels` so every GCP resource carries environment and project metadata.

## Common Pitfalls

- Never commit `terraform.tfvars` — use `.example` files and pass vars via mise tasks
- Never commit `.tfstate` files — state lives in GCS
- Reset `.terraform/environment` to `default` before `terraform init` in non-TTY contexts (CI) to avoid stale workspace prompts
- `terraform init -reconfigure` required when switching backends or prefixes
- Use `TF_VAR_*` env vars for CI secrets, not `-var` flags in scripts that might end up in logs
