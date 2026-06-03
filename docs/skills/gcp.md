---
title: gcp
---

# gcp

Context skill for Google Cloud Platform patterns — activates automatically, no slash command needed.

## Requirements

- `gcloud` CLI — [Google Cloud CLI installation](https://cloud.google.com/sdk/docs/install)
- `terraform` CLI — [terraform.io downloads](https://developer.hashicorp.com/terraform/install)

## Commands

This is a context skill. It activates automatically when `.tf` files, `GCP_` environment variables in `mise.toml`, or Dockerfiles referencing GCP registries are detected. No slash command is needed.

### Trigger conditions

The skill loads when any of the following are present:

- `.tf` or `.tfvars` files in the project
- `mise.toml` contains env vars prefixed `GCP_` (e.g. `GCP_REGISTRY_PROJECT_ID`)
- A `Dockerfile` references `gcr.io` or `*-docker.pkg.dev`
- Project uses `gcloud` CLI or has a `gcp-login` or `tf-apply` task
- User mentions GCP, gcloud, Cloud Run, Artifact Registry, BigQuery, GKE, or Terraform on GCP

### Recipes available

The skill loads auth, Artifact Registry, Cloud Run, and Terraform conventions before generating commands or config. It checks for `mise.toml` task wrappers (e.g. `mise run gcp-login`, `mise run tf-apply`) before writing raw `gcloud` or `terraform` commands.

| Situation | Recipe loaded |
|---|---|
| gcloud authentication and application default credentials | auth conventions |
| Artifact Registry image naming and push/pull | registry conventions |
| Cloud Run service deployment | cloud run conventions |
| Terraform backend, workspaces, and variable management | [terraform skill](/skills/terraform) |

Each recipe loads on demand — only what is relevant to the current task.

## References

- [Google Cloud CLI documentation](https://cloud.google.com/sdk/docs/reference)
- [Artifact Registry documentation](https://cloud.google.com/artifact-registry/docs)
- [Cloud Run documentation](https://cloud.google.com/run/docs)
