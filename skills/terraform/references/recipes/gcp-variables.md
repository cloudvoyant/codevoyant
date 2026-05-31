# Variable & tfvars Management

## Rule: Never Commit tfvars

All variable values are passed via mise task flags or `TF_VAR_*` env vars. The only committed tfvars file is a `.example` template:

```
infra/shared/terraform.tfvars.example   ← commit this
infra/shared/terraform.tfvars           ← gitignore this
```

Add to `.gitignore`:
```
infra/**/*.tfvars
!infra/**/*.tfvars.example
*.tfstate
*.tfstate.*
.terraform/
```

## Variable Passing Patterns

### mise tasks (local dev)

Vars are passed inline via `-var` flags:

```bash
terraform apply \
  -var="project=${PROJECT}" \
  -var="gcp_project_id=${GCP_PROJECT_ID}" \
  -var="gcp_region=${GCP_REGION}" \
  -var="environment_name=${WORKSPACE_NAME}" \
  -var="app_image=${APP_IMAGE}"
```

### CI/CD

Sensitive vars (image tag, secrets) via `TF_VAR_*` env vars — never in script args that appear in logs:

```bash
TF_VAR_app_image="us-east1-docker.pkg.dev/project/registry/app:v1.2.3"
mise run tf-apply prod
```

The `app_image` variable has `default = ""` so local plans without it still work.

## Standard Variables

```hcl
variable "project" {
  description = "Project name slug — used in resource naming and labels"
  type        = string
}

variable "gcp_project_id" {
  description = "GCP project ID for deployed resources"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
}

variable "environment_name" {
  description = "Environment: dev | stage | prod | preview-*"
  type        = string
}

variable "app_image" {
  description = "Docker image URI — set via TF_VAR_app_image in CI"
  type        = string
  default     = ""
}
```

## Locals for Environment Logic

```hcl
locals {
  is_prod = var.environment_name == "prod"
}

# Example: non-prod storage can be force-destroyed; prod cannot
module "storage_bucket" {
  force_destroy = var.environment_name != "prod" && var.environment_name != "stage"
}
```

## Secret Manager Integration

Runtime secrets (API keys, OAuth credentials) live in GCP Secret Manager — not in tfvars. Terraform reads them at apply time:

```hcl
data "google_secret_manager_secret_version" "app_secrets" {
  project = var.gcp_devops_project_id
  secret  = local.is_prod ? "${var.project}-secrets-prod" : "${var.project}-secrets-nonprod"
  version = "latest"
}
```

Parse the secret data as `KEY=VALUE` lines:

```hcl
locals {
  secret_lines = split("\n", data.google_secret_manager_secret_version.app_secrets.secret_data)
  secrets_map = {
    for line in local.secret_lines :
    trimspace(split("=", line)[0]) => trimspace(join("=", slice(split("=", line), 1, length(split("=", line)))))
    if length(regexall("^[A-Z_]+=.+", trimspace(line))) > 0
  }
}
```
