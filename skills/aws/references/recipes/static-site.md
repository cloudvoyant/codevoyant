# Static Site (SPA) — S3 + CloudFront

S3 website bucket, CloudFront distribution (403/404 → `index.html` for SPA routing), ACM cert + Route53 record, and the build → `s3 sync` → invalidate deploy flow.

DNS/ACM/CloudFront live in the secondary "commercial" account via the `aws.commercial` alias. ACM cert for CloudFront must be in `us-east-1`.

## 1. ACM cert + DNS validation (DNS account)

```hcl
# infra/modules/static_site/providers.tf
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

```hcl
# infra/modules/static_site/acm.tf
data "aws_route53_zone" "hosted_zone" {
  provider     = aws.commercial
  name         = var.hosted_zone_domain   # "acme.example.com"
  private_zone = false
}

resource "aws_acm_certificate" "cert" {
  provider          = aws.commercial
  domain_name       = local.full_domain
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "cert_validation" {
  provider = aws.commercial
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  zone_id         = data.aws_route53_zone.hosted_zone.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
}

resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.commercial
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
```

If a wildcard cert exists at the account level, look it up instead:

```hcl
data "aws_acm_certificate" "cert" {
  provider    = aws.commercial
  domain      = var.acm_cert_domain      # "*.acme.example.com"
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}
```

## 2. S3 website bucket + CloudFront

```hcl
# infra/modules/static_site/variables.tf
variable "resource_prefix"     { type = string }
variable "hosted_zone_domain"  { type = string }
variable "subdomain"           { type = string, default = "app" }
variable "allow_force_destroy" { type = bool, default = false }
```

```hcl
# infra/modules/static_site/main.tf
locals {
  bucket_name  = "${var.resource_prefix}--website"
  s3_origin_id = "${var.resource_prefix}--website-origin"
  full_domain  = "${var.subdomain}.${var.hosted_zone_domain}"
}

resource "aws_s3_bucket" "website" {
  provider      = aws.commercial
  bucket        = local.bucket_name
  force_destroy = var.allow_force_destroy
}

resource "aws_s3_bucket_website_configuration" "website" {
  provider = aws.commercial
  bucket   = aws_s3_bucket.website.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }   # SPA fallback
}

resource "aws_s3_bucket_public_access_block" "website" {
  provider                = aws.commercial
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website" {
  provider = aws.commercial
  bucket   = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.website.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.website]
}

resource "aws_cloudfront_distribution" "site" {
  provider            = aws.commercial
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [local.full_domain]

  origin {
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = local.s3_origin_id
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"   # S3 website endpoints are HTTP-only
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # SPA routing: map both 404 and 403 (S3 AccessDenied on miss) to index.html
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 3000
  }
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 3000
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.cert.certificate_arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_route53_record" "site" {
  provider = aws.commercial
  zone_id  = data.aws_route53_zone.hosted_zone.id
  name     = local.full_domain
  type     = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = true
  }
}

output "bucket_name"                { value = aws_s3_bucket.website.bucket }
output "cloudfront_distribution_id" { value = aws_cloudfront_distribution.site.id }
output "url"                        { value = "https://${local.full_domain}" }
```

## 3. Instantiate in the root

```hcl
# infra/environment/static_site.tf
module "static_site" {
  source             = "../modules/static_site"
  resource_prefix    = local.resource_prefix
  hosted_zone_domain = "${local.environment}.acme.example.com"
  subdomain          = "app"

  providers = {
    aws            = aws
    aws.commercial = aws.commercial
  }
}

# Expose distribution id for the deploy script
output "static_site_distribution_id" { value = module.static_site.cloudfront_distribution_id }
```

## 4. Build → sync → invalidate (`scripts/deploy-frontend.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

environment="${1:-dev}"
project="acme-platform"
workspace="$environment"
profile="acme-${environment}-secondary"     # DNS/CDN account
region="us-west-2"

bucket="${project}-${workspace}--website"

dist_id=$(cd infra/environment \
  && terraform workspace select "$workspace" \
  && terraform output -raw static_site_distribution_id)

pushd frontend >/dev/null
pnpm install
pnpm build       # emits to dist/
popd >/dev/null

aws s3 sync frontend/dist/ "s3://$bucket/" --delete --profile "$profile" --region "$region"

aws cloudfront create-invalidation \
  --profile "$profile" --region "$region" \
  --distribution-id "$dist_id" \
  --paths "/*" > /dev/null

echo "Frontend deployed: https://app.${workspace}.acme.example.com/"
```

## Verify

```bash
aws cloudfront get-distribution \
  --id "$(cd infra/environment && terraform output -raw static_site_distribution_id)" \
  --profile acme-dev-secondary --query 'Distribution.Status'   # "Deployed"

# SPA serves index.html on deep links (200, not 404)
curl -s -o /dev/null -w '%{http_code}\n' https://app.dev.acme.example.com/some/route   # 200
```
