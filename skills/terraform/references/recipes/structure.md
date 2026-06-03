# Terraform Directory Structure

Based on nv-gcp-template: shared resources vs environment resources split. See the [Terraform module docs](https://developer.hashicorp.com/terraform/language/modules) for the general module system — here's the specific layout decision and why.

## Why shared/ vs environments/?

The split avoids a common mistake: applying CDN, Artifact Registry, and IAM setup on every `tf-apply` when those resources only need to be created once. Shared resources are provisioned once, then referenced by environments via data sources. Mixing them into a single workspace means every dev deploy touches your CDN config.

## Layout

```
infra/
  shared/           ← one-time shared resources (CDN, Artifact Registry, IAM, backend bucket)
  environments/     ← per-environment resources (Cloud Run service, storage buckets, secrets)
  modules/          ← reusable modules referenced by shared/ and environments/
    cdn/
    storage-bucket/
    nv-fullstack-app/
```

## shared/ vs environments/

| | shared/ | environments/ |
|---|---|---|
| Applied once | Yes | No — once per workspace |
| Examples | CDN, Artifact Registry, terraform backend bucket | Cloud Run service, per-env storage |
| Workspaces | No | Yes (dev, stage, prod, preview-*) |
| State path | `${PREFIX}/shared/default.tfstate` | `${PREFIX}/env:/dev/default.tfstate` |

## File Conventions

Every workspace root contains:

```
main.tf        ← module calls and data sources
variables.tf   ← input variable declarations
outputs.tf     ← output values (read by mise tasks for local config)
providers.tf   ← provider config with default_labels
backend.tf     ← backend "gcs" stub (config passed at init time)
versions.tf    ← required_providers + terraform version constraint
```

Optional:
```
terraform.tfvars.example   ← gitignored tfvars template for local dev
```

## Module Structure

Each module in `modules/` follows the same file pattern:

```
modules/my-module/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  README.md
```

Call modules with a relative source path:

```hcl
module "storage_bucket" {
  source = "../modules/storage-bucket"

  project          = var.project
  gcp_project_id   = var.gcp_project_id
  environment_name = var.environment_name
}
```
