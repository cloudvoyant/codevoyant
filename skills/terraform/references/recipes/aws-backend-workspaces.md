# AWS Backend & Workspace Management

## S3 Backend

```hcl
# infra/environments/backend.tf
terraform {
  backend "s3" {
    # Bucket, key, and region passed via -backend-config during init
    # Never hardcode — passed by the tf-init task
  }
}
```

Init with backend config:

```bash
terraform init \
  -backend-config="bucket=${TF_BACKEND_BUCKET}" \
  -backend-config="key=${PROJECT}/${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -reconfigure
```

State locking via DynamoDB — add to init:

```bash
  -backend-config="dynamodb_table=${PROJECT}-terraform-locks"
```

## Workspace-per-Environment

Workspaces: `dev`, `stage`, `prod`, `preview-{id}`.

State paths in the S3 bucket:

```
${PROJECT}/dev/terraform.tfstate
${PROJECT}/stage/terraform.tfstate
${PROJECT}/prod/terraform.tfstate
```

## Creating the Backend Bucket

Use an idempotent mise task — never create manually:

```bash
#!/usr/bin/env bash
#MISE description="Create S3 backend bucket and DynamoDB lock table (idempotent, delete-protected)"
BUCKET="${TF_BACKEND_BUCKET}"
LOCK_TABLE="${PROJECT}-terraform-locks"

# Create bucket (idempotent — us-east-1 does not accept LocationConstraint)
if [ "${AWS_REGION}" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "${BUCKET}" --region "${AWS_REGION}" 2>/dev/null || echo "Bucket exists"
else
  aws s3api create-bucket \
    --bucket "${BUCKET}" \
    --region "${AWS_REGION}" \
    --create-bucket-configuration LocationConstraint="${AWS_REGION}" 2>/dev/null || echo "Bucket exists"
fi

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "${BUCKET}" \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Delete protection via bucket policy
aws s3api put-bucket-policy --bucket "${BUCKET}" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Deny\",
    \"Principal\": \"*\",
    \"Action\": \"s3:DeleteBucket\",
    \"Resource\": \"arn:aws:s3:::${BUCKET}\"
  }]
}"

# Create DynamoDB lock table (idempotent, with deletion protection)
aws dynamodb create-table \
  --table-name "${LOCK_TABLE}" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "${AWS_REGION}" \
  --deletion-protection-enabled 2>/dev/null || echo "Lock table exists"

echo "Backend ready: s3://${BUCKET}, lock: ${LOCK_TABLE}"
```

The task is safe to re-run — all operations are idempotent.
