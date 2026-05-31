---
title: terraform
---

# terraform

Context skill for Terraform infrastructure patterns. Activates automatically when `.tf` files are detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're writing or reviewing Terraform the agent loads directory structure conventions, backend config patterns, workspace management, variable handling, and mise task wrappers — based on nv-gcp-template conventions.

## Recipes

| Working on… | Recipe loaded |
|---|---|
| Directory structure and module layout | `structure` |
| Backend config and workspace management | `backend-workspaces` |
| Variable and tfvars management | `variables` |
| mise task wrappers (tf-init, tf-plan, tf-apply) | `mise-tasks` |

## Directory Structure

```
infra/
  shared/           ← one-time shared resources (CDN, Artifact Registry, IAM)
  environments/     ← per-workspace resources (Cloud Run, storage, secrets)
  modules/          ← reusable modules
```

Two separate Terraform roots: `shared/` is applied once; `environments/` is applied per workspace.

## Workspace-per-Environment

Workspaces map to environments: `dev`, `stage`, `prod`, `preview-{issue-id}`.

State lives in a shared GCS backend bucket — one state file per workspace:

```
${GCP_DEVOPS_PROJECT_ID}-terraform-backend-storage/
  ${GCP_PROJECT_ID}/${PROJECT}/env:/dev/default.tfstate
  ${GCP_PROJECT_ID}/${PROJECT}/env:/stage/default.tfstate
  ${GCP_PROJECT_ID}/${PROJECT}/env:/prod/default.tfstate
```

## mise Tasks

```bash
mise run tf-init dev       # initialize backend + select workspace
mise run tf-plan dev       # plan changes
mise run tf-apply dev      # apply changes

mise run tf-apply-shared   # apply shared infrastructure (once)
```

In CI, set `TF_VAR_app_image` before `tf-apply` to deploy a specific image:

```bash
TF_VAR_app_image="us-east1-docker.pkg.dev/project/registry/app:v1.2.3" \
  mise run tf-apply prod
```

## Variable Management

- **Never commit `terraform.tfvars`** — commit `.tfvars.example` templates only
- Pass vars via `-var` flags in mise tasks for local dev
- Pass sensitive vars (image tags, secrets) via `TF_VAR_*` env vars in CI
- Runtime secrets live in GCP Secret Manager — Terraform reads them at apply time via `google_secret_manager_secret_version` data sources

## Common Pitfalls

- Never commit `.tfstate` files or `terraform.tfvars` — add them to `.gitignore`
- Run `tf-create-backend` once before first `tf-init` to provision the GCS backend bucket
- Always pin Terraform major version in `mise.toml`: `terraform = "1"`
- `terraform init -reconfigure` required when switching backend configs
