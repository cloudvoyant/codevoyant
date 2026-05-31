# AWS Terraform mise Tasks

## Task Reference

| Task | Description |
|---|---|
| `tf-create-backend` | Create S3 bucket + DynamoDB lock table (idempotent) |
| `tf-init <env>` | Init backend + select workspace |
| `tf-plan <env>` | Plan changes |
| `tf-apply <env>` | Apply changes |
| `tf-destroy <env>` | Destroy infrastructure |

## mise.toml Setup

```toml
[env]
AWS_REGION        = "us-east-1"
AWS_ACCOUNT_ID    = "123456789012"
TF_BACKEND_BUCKET = "${PROJECT}-terraform-state"

[tools]
terraform = "1"

[task_config]
includes = ["mise-tasks"]

[settings]
experimental = true
```

## Task Scripts (mise-tasks/)

### tf-init

```bash
#!/usr/bin/env bash
#MISE description="Initialize Terraform backend and select workspace"
set -euo pipefail

ENVIRONMENT="${1:-dev}"

terraform -chdir=infra/environments init \
  -backend-config="bucket=${TF_BACKEND_BUCKET}" \
  -backend-config="key=${PROJECT}/${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${PROJECT}-terraform-locks" \
  -reconfigure

terraform -chdir=infra/environments workspace select "${ENVIRONMENT}" 2>/dev/null \
  || terraform -chdir=infra/environments workspace new "${ENVIRONMENT}"
```

### tf-plan

```bash
#!/usr/bin/env bash
#MISE description="Plan Terraform changes for an environment"
set -euo pipefail

ENVIRONMENT="${1:-dev}"
mise run tf-init "${ENVIRONMENT}"

terraform -chdir=infra/environments plan \
  -var="project=${PROJECT}" \
  -var="aws_region=${AWS_REGION}" \
  -var="environment_name=${ENVIRONMENT}" \
  -var="aws_account_id=${AWS_ACCOUNT_ID}" \
  -var="app_image=${TF_VAR_app_image:-}"
```

### tf-apply

```bash
#!/usr/bin/env bash
#MISE description="Apply Terraform changes for an environment"
set -euo pipefail

ENVIRONMENT="${1:-dev}"
mise run tf-init "${ENVIRONMENT}"

terraform -chdir=infra/environments apply \
  -var="project=${PROJECT}" \
  -var="aws_region=${AWS_REGION}" \
  -var="environment_name=${ENVIRONMENT}" \
  -var="aws_account_id=${AWS_ACCOUNT_ID}" \
  -var="app_image=${TF_VAR_app_image:-}" \
  -auto-approve
```

## Usage

```bash
mise run tf-create-backend       # once, before first init
mise run tf-init dev
mise run tf-plan dev
mise run tf-apply dev

# CI — inject image before apply
TF_VAR_app_image="123456.dkr.ecr.us-east-1.amazonaws.com/app:v1.2.3" \
  mise run tf-apply prod
```
