# AWS Variable & Provider Setup

## Standard Variables

```hcl
variable "project"          { type = string }
variable "aws_region"       { type = string; default = "us-east-1" }
variable "environment_name" { type = string }  # dev | stage | prod | preview-*
variable "app_image"        { type = string; default = "" }  # ECR URI, set via TF_VAR_app_image in CI
variable "aws_account_id"   { type = string }
```

## Provider

```hcl
# infra/environments/providers.tf
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment_name
      ManagedBy   = "terraform"
    }
  }
}
```

Always set `default_tags` — it propagates to all resources. Don't duplicate tags in individual resource blocks.

## Versions File

```hcl
# infra/environments/versions.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Variable Passing

Never commit `terraform.tfvars`. Pass vars via `-var` flags in mise tasks for local dev:

```bash
terraform apply \
  -var="project=${PROJECT}" \
  -var="aws_region=${AWS_REGION}" \
  -var="environment_name=${ENVIRONMENT}" \
  -var="aws_account_id=${AWS_ACCOUNT_ID}"
```

In CI, sensitive vars (image URIs, secrets) go via `TF_VAR_*` env vars:

```bash
TF_VAR_app_image="123456789.dkr.ecr.us-east-1.amazonaws.com/app:v1.2.3" \
  mise run tf-apply prod
```

## Authentication

Local development:

```bash
export AWS_PROFILE=my-profile
# or
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

CI — use OIDC (recommended over long-lived keys):

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/TerraformDeployRole \
  --role-session-name terraform-ci
```

Never commit AWS credentials — use IAM roles or OIDC federation.
