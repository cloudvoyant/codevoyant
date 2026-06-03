# Infra Structure, Naming & Module Conventions

Directory layout, naming/prefix conventions, and the workspace-per-environment pattern shared across all AWS recipes in this skill.

## Directory layout

```
.
├── infra/
│   ├── environment/          # the root module — one per repo, applied per workspace
│   │   ├── providers.tf      # terraform{} + provider/alias config
│   │   ├── backend.tf        # S3 remote state config
│   │   ├── main.tf           # locals + module instantiations
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── modules/              # reusable building blocks consumed by environment/
│       ├── network/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       └── <other-modules>/
└── scripts/                  # bash deploy / automation glue
    ├── utils.sh
    ├── create-tf-backend.sh
    ├── tf-init.sh
    ├── tf-plan.sh
    └── tf-apply.sh
```

Rules:

- **`infra/environment` is the only root** you `terraform apply`. It is thin: locals + module calls. No raw resources unless they are genuinely top-level (cluster, ALB, DNS zone).
- **`infra/modules/<name>`** are reusable. Each module is a folder with `main.tf`, `variables.tf`, `outputs.tf` (+ `providers.tf` only if it needs a provider alias).
- An alternative **standalone** layout (`environments/<env>/<project>/`, one dir per env+project with its own `backend.tf`) also works for small/independent stacks (e.g. the Ray cluster recipe), but prefer single-root + workspace for multi-env stacks.

## Naming + prefix conventions

Set these locals once in `infra/environment/main.tf`:

```hcl
locals {
  project             = "acme-platform"                       # 1:1 with the repo
  environment         = split("-", terraform.workspace)[0]    # dev / stage / prod
  resource_prefix     = "${local.project}-${terraform.workspace}"
  is_temp_environment = length(split("-", terraform.workspace)) > 1   # e.g. "dev-feature-x"
  environment_suffix  = local.is_temp_environment ? replace(terraform.workspace, local.environment, "") : ""
}
```

Then everywhere:

- **Module variables** take a `resource_prefix` and name resources `"${var.resource_prefix}--<name>"` — the **double hyphen** separates prefix from resource name. Example: `acme-platform-dev--artifacts`.
- **Module input names** are descriptive and role-based (`ecs_cluster_name`, `subnet_ids`, `worker_instance_type`), not abbreviations.
- **Module names** in the root describe what they create (`module "vpc"`, `module "service"`).
- A module that creates one well-known resource may name it generically (`aws_s3_bucket.internal_s3`) — public identity comes from the prefix.

Minimal module that follows the convention:

```hcl
# infra/modules/s3/main.tf
locals {
  bucket_name = "${var.resource_prefix}--${var.bucket_name}"
}

resource "aws_s3_bucket" "internal_s3" {
  bucket = local.bucket_name
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "s3_versioning" {
  count  = var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.internal_s3.id
  versioning_configuration { status = "Enabled" }
}
```

```hcl
# infra/modules/s3/variables.tf
variable "resource_prefix"   { type = string }
variable "bucket_name"       { type = string }
variable "enable_versioning" { type = bool, default = false }
```

## Bootstrap the S3 state backend (`scripts/create-tf-backend.sh`)

Backend bucket must exist before `terraform init`. Derive name from the repo, create idempotently:

```bash
#!/usr/bin/env bash
set -euo pipefail
source ./scripts/utils.sh   # provides get_project_name (repo name, _ -> -)

PROFILE="acme-dev"
REGION="us-east-1"

project=$(get_project_name)
bucket="${project}-terraform-backend"

if AWS_PAGER="" aws s3api head-bucket --bucket "$bucket" --profile "$PROFILE" --region "$REGION" 2>/dev/null; then
  echo "Backend bucket '$bucket' already exists. Skipping."
  exit 0
fi

aws s3 mb "s3://$bucket" --profile "$PROFILE" --region "$REGION"

aws s3api put-bucket-versioning --profile "$PROFILE" --bucket "$bucket" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --profile "$PROFILE" --bucket "$bucket" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

echo "Created backend bucket: $bucket"
```

`scripts/utils.sh` helpers:

```bash
function get_project_name {
  local url; url=$(git config --get remote.origin.url)
  url=${url%.git}
  local name; name=$(echo "$url" | sed -E 's/.*[/:]([^/]+)$/\1/')
  echo "${name//_/-}"
}

function select_tf_workspace {
  local environment=$1
  cd infra/environment
  terraform workspace select "$environment" || terraform workspace new "$environment"
}
```

## Backend config (`infra/environment/backend.tf`)

```hcl
terraform {
  backend "s3" {
    bucket  = "acme-platform-terraform-backend"
    key     = "terraform.tfstate"
    region  = "us-east-1"
    profile = "acme-dev"
    encrypt = true
  }
}
```

The `key` is constant — **environments are separated by workspace**, not by key. State lands at `env:/<workspace>/terraform.tfstate` automatically.

## One workspace per environment

```bash
cd infra/environment
terraform init                       # configures S3 backend
terraform workspace new dev          # first time
terraform workspace new stage
terraform workspace new prod
terraform workspace select dev       # thereafter
```

Temp/preview environments use a suffixed workspace like `dev-feature-x`; `environment = split("-", terraform.workspace)[0]` collapses them back to `dev` for account/profile selection while keeping isolated state and resource prefixes.

## tf-init / tf-plan / tf-apply glue

```bash
# scripts/tf-init.sh
#!/usr/bin/env bash
set -euo pipefail
source ./scripts/utils.sh
cd infra/environment
terraform init
```

```bash
# scripts/tf-apply.sh — usage: ./scripts/tf-apply.sh dev
#!/usr/bin/env bash
set -euo pipefail
source ./scripts/utils.sh
environment="${1:-dev}"

./scripts/tf-init.sh
select_tf_workspace "$environment"
terraform apply -auto-approve
```

`tf-plan.sh` is identical but ends with `terraform plan -out=tfplan`.

## Tagging

`default_tags` on the provider block stamps every resource — don't duplicate tags in individual resource blocks:

```hcl
provider "aws" {
  default_tags {
    tags = {
      project     = local.project
      environment = terraform.workspace
    }
  }
}
```

Standard tag set:

- `project` — the repo slug (cost attribution, tag-scoped IAM)
- `environment` — workspace name
- `managed_by` — `"terraform"` (so manual changes are obvious in console)
- `owner` — email or team for paging

## Verify

```bash
./scripts/create-tf-backend.sh
aws s3 ls --profile acme-dev | grep terraform-backend

cd infra/environment
terraform init
terraform workspace list                   # shows dev/stage/prod
terraform workspace select dev
terraform plan                             # resource names start with acme-platform-dev--
```
