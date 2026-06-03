---
name: gcp
description: 'GCP context skill — gcloud authentication, Artifact Registry image push/pull, Cloud Run deploy, Terraform infra patterns, and common mise.toml GCP env vars. Triggers on: ".tf files", "Terraform", "Dockerfile with gcr.io or pkg.dev", "mise.toml with GCP_ env vars", "gcloud commands", "Cloud Run", "Artifact Registry", "GCP project", "service account impersonation".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: false
---

# GCP Patterns

Lightweight context skill. Loads GCP auth, Artifact Registry, Cloud Run, and Terraform conventions into the agent when GCP-related files are detected.

## Triggers

Load this skill when any of the following are present:

- File extensions: `*.tf`, `*.tfvars`
- `mise.toml` contains env vars prefixed `GCP_` (e.g. `GCP_REGISTRY_PROJECT_ID`)
- `Dockerfile` references `gcr.io` or `*-docker.pkg.dev`
- Project uses `gcloud` CLI or has a `gcp-login` / `tf-apply` task
- User mentions GCP, gcloud, Cloud Run, Artifact Registry, BigQuery, GKE, or Terraform on GCP

## Authentication

Local development (application default credentials):

```bash
gcloud auth application-default login
```

Service account impersonation (preferred over key files):

```bash
gcloud auth print-access-token \
  --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com
```

Docker auth for Artifact Registry (run once per region):

```bash
gcloud auth configure-docker REGION-docker.pkg.dev
```

Many projects expose a `mise run gcp-login` task that wraps these — check `mise.toml` first.

## Artifact Registry

See the [Artifact Registry docs](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) for the full push/pull reference — here's what matters for our projects:

Image naming convention (always construct from these env vars, never hardcode a region):

```
${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}:${VERSION}
```

Projects that use Docker recipes (see the `docker` skill's `gcp-registry` recipe) wire this into `docker-compose.yml` `image:` fields and `mise run docker-push` tasks so the full name never appears as a one-liner in commands.

## Cloud Run

See the [Cloud Run docs](https://cloud.google.com/run/docs/deploying) for full deployment flags — here's what matters:

Always use `mise run deploy` (or equivalent task) rather than bare `gcloud run deploy` — the task bakes in `--image`, `--region`, `--project`, and any service-account bindings. Check `mise.toml` first.

The flags worth knowing when diagnosing a failed deploy: `--service-account` (must have Artifact Registry read), `--min-instances` (avoids cold starts), `--allow-unauthenticated` vs IAP. The most common failure is `Permission denied on image` — the deploying service account needs `roles/artifactregistry.reader` on the registry project.

## Terraform

Standard layout: infrastructure code lives in `infra/` (or `terraform/`) at the repo root, with environment-specific tfvars under `infra/envs/{env}/`.

Common workflow:

```bash
cd infra
terraform init
terraform plan -var-file=envs/dev/terraform.tfvars
terraform apply -var-file=envs/dev/terraform.tfvars
```

Most projects wrap these in mise/just tasks:

- `mise run tf-init`
- `mise run tf-plan ENV=dev`
- `mise run tf-apply ENV=dev`

Always check the project's task runner (call `/task list`) before running raw `terraform` commands.

## Common Env Vars (mise.toml)

When you see these in `[env]`, the project is GCP-based:

- `GCP_REGISTRY_PROJECT_ID` — GCP project hosting Artifact Registry
- `GCP_REGISTRY_REGION` — registry region (e.g. `us-central1`)
- `GCP_REGISTRY_NAME` — Artifact Registry repository name
- `GCP_PROJECT_ID` — deployment target project (may differ from registry project)
- `PROJECT` — project slug, often used as image/service name
- `VERSION` — read from `version.txt` for image tags

## Common Pitfalls

- Application default credentials expire — re-run `gcloud auth application-default login` if you see auth errors
- Artifact Registry regions are not aliases — `us-central1-docker.pkg.dev` and `us-east1-docker.pkg.dev` are distinct hosts
- Cloud Run requires the image to be in an Artifact Registry the service account can read — check IAM bindings if deploys fail with "Permission denied on image"
- Terraform state should live in a GCS bucket with versioning enabled; never commit `.tfstate` files
- Do not commit service account JSON keys — use impersonation or workload identity federation
