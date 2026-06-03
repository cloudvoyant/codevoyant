# S3 Backend + DynamoDB State Locking

Remote state in S3 with DynamoDB for locking. Bootstrap problem: bucket+table must exist before `terraform init` — create them once with a local backend (or a bash script), then migrate.

## Backend block (`infra/environment/backend.tf`)

Partial config — pass values via `-backend-config` at init time:

```hcl
terraform {
  backend "s3" {
    # bucket / key / region / dynamodb_table passed via -backend-config
    encrypt = true
  }
}
```

Or fully declared:

```hcl
terraform {
  backend "s3" {
    bucket         = "acme-platform-terraform-backend"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    profile        = "acme-dev"
    dynamodb_table = "acme-platform-terraform-locks"
    encrypt        = true
  }
}
```

The `key` is constant — environments are separated by **workspace**, not by key. Each workspace's state lands at `env:/<workspace>/terraform.tfstate` automatically.

## Backend resources — Terraform-managed (separate root)

A dedicated `infra/shared/backend/` root creates the bucket + table. It uses a **local backend** itself (chicken-and-egg) and is applied once per account:

```hcl
# infra/shared/backend/main.tf
terraform {
  required_version = ">= 1.2"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # No backend block — local state.
}

provider "aws" {
  profile = var.aws_profile
  region  = var.aws_region
}

variable "project"     { type = string }
variable "aws_profile" { type = string }
variable "aws_region"  { type = string, default = "us-east-1" }

locals {
  bucket = "${var.project}-terraform-backend"
  table  = "${var.project}-terraform-locks"
}

resource "aws_s3_bucket" "state" {
  bucket = local.bucket
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "deny_delete" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyBucketDeletion"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:DeleteBucket"
      Resource  = aws_s3_bucket.state.arn
    }]
  })
}

resource "aws_dynamodb_table" "locks" {
  name         = local.table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  deletion_protection_enabled = true
  lifecycle { prevent_destroy = true }
}

output "bucket"         { value = aws_s3_bucket.state.bucket }
output "dynamodb_table" { value = aws_dynamodb_table.locks.name }
```

Apply once:

```bash
cd infra/shared/backend
terraform init
terraform apply -var="project=acme-platform" -var="aws_profile=acme-dev"
```

## Backend resources — bash bootstrap (alternative)

Idempotent script — avoid the local-state chicken-and-egg entirely:

```bash
#!/usr/bin/env bash
# scripts/create-tf-backend.sh
set -euo pipefail

PROJECT="${PROJECT:-acme-platform}"
PROFILE="${AWS_PROFILE:-acme-dev}"
REGION="${AWS_REGION:-us-east-1}"
BUCKET="${PROJECT}-terraform-backend"
TABLE="${PROJECT}-terraform-locks"

# Bucket (us-east-1 omits LocationConstraint)
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" --profile "$PROFILE" --region "$REGION" 2>/dev/null \
    || echo "Bucket $BUCKET exists"
else
  aws s3api create-bucket --bucket "$BUCKET" --profile "$PROFILE" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null \
    || echo "Bucket $BUCKET exists"
fi

aws s3api put-bucket-versioning --profile "$PROFILE" --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --profile "$PROFILE" --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block --profile "$PROFILE" --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# DynamoDB lock table
aws dynamodb create-table \
  --profile "$PROFILE" --region "$REGION" \
  --table-name "$TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --deletion-protection-enabled 2>/dev/null || echo "Table $TABLE exists"

echo "Backend ready: s3://$BUCKET (locks: $TABLE)"
```

## Init with backend config

Partial config — pass per environment:

```bash
terraform init \
  -backend-config="bucket=acme-platform-terraform-backend" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=acme-platform-terraform-locks" \
  -backend-config="profile=acme-dev" \
  -reconfigure
```

Or via a `backend.hcl` file:

```hcl
# infra/environment/backend.dev.hcl
bucket         = "acme-platform-terraform-backend"
key            = "terraform.tfstate"
region         = "us-east-1"
profile        = "acme-dev"
dynamodb_table = "acme-platform-terraform-locks"
```

```bash
terraform init -backend-config=backend.dev.hcl -reconfigure
```

## Migrating from local to S3 backend

```bash
# 1. Bootstrap the bucket+table
./scripts/create-tf-backend.sh

# 2. Add backend "s3" {} block to backend.tf

# 3. Re-init — Terraform offers to copy existing state to S3
terraform init -migrate-state
```

## `.tfvars` vs env vars for backend config

- Backend config does NOT read `terraform.tfvars` — only `-backend-config` flags or `backend.hcl` files.
- Sensitive backend config (e.g. profile names in CI) goes via env: `AWS_PROFILE`, `AWS_REGION`.
- Per-workspace state files live under `env:/<workspace>/<key>` automatically — never set `key` per environment.

## Common pitfalls

- **Bucket deletion**: `prevent_destroy` on `aws_s3_bucket.state` + the deny-delete bucket policy — a misplaced `terraform destroy` should not be able to nuke state.
- **DynamoDB deletion**: `deletion_protection_enabled = true` + `prevent_destroy`. Restoring a deleted lock table is fine; restoring corrupted state is not.
- **`-reconfigure` vs `-migrate-state`**: use `-reconfigure` when backend config changes but state stays in the same backend, `-migrate-state` when moving state between backends.
- **Multiple roots, one bucket**: each root uses a distinct `key` (e.g. `shared/terraform.tfstate`, `environment/terraform.tfstate`).
