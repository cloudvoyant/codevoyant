# AWS Provider Setup & Multi-Account Auth

Configure the `hashicorp/aws` provider, authenticate via named CLI profiles, and support a primary-compute / secondary-DNS account split via a provider alias.

## Named CLI profiles (`~/.aws/credentials`)

Auth is by named AWS CLI profile — never static keys in `.tf`:

```ini
[acme-dev]
aws_access_key_id     = AKIA................
aws_secret_access_key = ....................................

[acme-dev-secondary]
aws_access_key_id     = AKIA................
aws_secret_access_key = ....................................

[acme-prod]
aws_access_key_id     = AKIA................
aws_secret_access_key = ....................................

[acme-prod-secondary]
aws_access_key_id     = AKIA................
aws_secret_access_key = ....................................
```

Naming: `acme-<env>[-secondary]`. Verify:

```bash
aws sts get-caller-identity --profile acme-dev
```

## Assume-role profiles (`~/.aws/config`)

```ini
[profile acme-prod]
role_arn       = arn:aws:iam::123456789012:role/terraform-deploy
source_profile = acme-bootstrap
region         = us-east-1
```

## Provider block (`infra/environment/providers.tf`)

```hcl
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.0"
      configuration_aliases = [aws.commercial]
    }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  profile = local.aws_profile_primary
  region  = "us-east-1"

  default_tags {
    tags = {
      project     = local.project
      environment = terraform.workspace
    }
  }
}

provider "aws" {
  alias   = "commercial"
  profile = local.aws_profile_secondary
  region  = "us-west-2"

  default_tags {
    tags = {
      project     = local.project
      environment = terraform.workspace
    }
  }
}
```

`default_tags` stamps every resource — drives cost attribution and tag-scoped IAM.

## Single-account variant (no alias)

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.aws_region
}
```

## Map profiles per environment (`main.tf` locals)

Workspace name drives profile lookup; same code deploys to dev/stage/prod by switching workspace:

```hcl
locals {
  project     = "acme-platform"
  environment = split("-", terraform.workspace)[0]   # "dev-feature-x" -> "dev"

  aws_profile_primary = {
    dev   = "acme-dev"
    stage = "acme-prod"   # stage lives in the prod account
    prod  = "acme-prod"
  }[local.environment]

  aws_profile_secondary = {
    dev   = "acme-dev-secondary"
    stage = "acme-prod-secondary"
    prod  = "acme-prod-secondary"
  }[local.environment]
}
```

## Route DNS/CDN modules to the secondary account

```hcl
module "dns" {
  source = "../modules/dns"
  providers = {
    aws = aws.commercial
  }
}
```

Inside such a module, declare the alias requirement:

```hcl
# infra/modules/dns/providers.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 6.0"
      configuration_aliases = [aws.commercial]
    }
  }
}
```

Read data from a specific account inside the root:

```hcl
data "aws_region" "primary" {}
data "aws_region" "secondary" {
  provider = aws.commercial
}
```

## CI runner bootstrap (`scripts/get-creds.sh`)

Runner starts with one set of keys (primary-prod); pull the rest from Secrets Manager and write to `~/.aws/credentials`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SECRET_ID="${CI_CREDS_SECRET_ID:-AcmeRunnerSecrets}"
PRIMARY_PROFILE="acme-prod"
REGION="us-east-1"

add_profile() {
  local name=$1 key=$2 secret=$3
  {
    echo "[$name]"
    echo "aws_access_key_id = $key"
    echo "aws_secret_access_key = $secret"
    echo ""
  } >> ~/.aws/credentials
}

mkdir -p ~/.aws
[ -f ~/.aws/credentials ] && { echo "credentials already present, skipping"; exit 0; }
touch ~/.aws/credentials

add_profile "$PRIMARY_PROFILE" "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY"

secret=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" --query SecretString --output text \
  --profile "$PRIMARY_PROFILE" --region "$REGION")

get() { echo "$secret" | jq -r ".$1"; }

add_profile "acme-dev"            "$(get DEV_ACCESS_KEY)"       "$(get DEV_SECRET_KEY)"
add_profile "acme-dev-secondary"  "$(get DEV_SEC_ACCESS_KEY)"   "$(get DEV_SEC_SECRET_KEY)"
add_profile "acme-prod-secondary" "$(get PROD_SEC_ACCESS_KEY)"  "$(get PROD_SEC_SECRET_KEY)"
```

## Verify

```bash
aws sts get-caller-identity --profile acme-dev            --query Account --output text
aws sts get-caller-identity --profile acme-dev-secondary  --query Account --output text

cd infra/environment
terraform init
terraform workspace new dev 2>/dev/null || terraform workspace select dev
terraform providers
terraform plan
```
