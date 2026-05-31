---
title: gcp
---

# gcp

Context skill for Google Cloud Platform patterns. Activates automatically when `*.tf` files, `GCP_` environment variables in `mise.toml`, or Dockerfiles referencing GCP registries are detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're working on a GCP-backed project the agent loads auth, Artifact Registry, Cloud Run, and Terraform conventions before generating commands or config. It also checks for mise tasks wrapping GCP operations (e.g. `mise run gcp-login`, `mise run tf-apply`) before writing raw `gcloud` or `terraform` commands.

## Authentication

Local development — application default credentials:

```bash
gcloud auth application-default login
```

Docker auth for Artifact Registry (run once per region):

```bash
gcloud auth configure-docker REGION-docker.pkg.dev
```

Many projects expose a `mise run gcp-login` task that wraps these — the agent checks `mise.toml` first.

Service account impersonation (preferred over key files):

```bash
gcloud auth print-access-token \
  --impersonate-service-account=SA@PROJECT_ID.iam.gserviceaccount.com
```

## Artifact Registry

Image naming convention:

```
REGION-docker.pkg.dev/PROJECT_ID/REGISTRY_NAME/IMAGE_NAME:TAG
```

Push:

```bash
docker push us-central1-docker.pkg.dev/my-project/services/api:v1.2.3
```

Common `mise.toml` env vars:

```toml
[env]
GCP_REGISTRY_PROJECT_ID = "devops-466002"
GCP_REGISTRY_REGION     = "us-east1"
GCP_REGISTRY_NAME       = "cloudvoyant-docker-registry"
PROJECT                 = "my-app"
VERSION                 = "{{ exec(command='cat version.txt') }}"
```

## Cloud Run

Deploy from Artifact Registry:

```bash
gcloud run deploy SERVICE_NAME \
  --image REGION-docker.pkg.dev/PROJECT/REGISTRY/NAME:TAG \
  --region REGION \
  --project PROJECT_ID \
  --platform managed \
  --allow-unauthenticated
```

Common flags: `--service-account`, `--set-env-vars`, `--memory`, `--cpu`, `--min-instances`, `--max-instances`.

## Terraform

For full Terraform patterns (directory structure, backends, workspaces, variable management) see the [terraform skill](/skills/terraform).

## Common Pitfalls

- ADC credentials expire — re-run `gcloud auth application-default login` if you see auth errors
- Artifact Registry regions are distinct hosts — `us-central1-docker.pkg.dev` ≠ `us-east1-docker.pkg.dev`
- Cloud Run deploy fails with "Permission denied on image" — check IAM bindings for the service account
- Never commit service account JSON keys — use impersonation or workload identity federation
- Terraform state must live in a GCS bucket with versioning enabled; never commit `.tfstate`
