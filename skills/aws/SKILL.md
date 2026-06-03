---
name: aws
description: "AWS infrastructure patterns with Terraform. Load when writing .tf files targeting AWS, setting up S3/DynamoDB Terraform backend, deploying ECS services, Lambda functions, static sites with CloudFront, Ray clusters, or Firecracker VM fleets."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# AWS Patterns

AWS infrastructure recipes — provider/backend setup, ECS-on-EC2, Lambda + API Gateway, S3 + CloudFront static sites, Ray clusters, and Firecracker microVM fleets. All recipes assume Terraform `>= 1.2` and the `hashicorp/aws ~> 5.0` (or `~> 6.0`) provider.

## When to load recipes

| You are working on… | Load recipe |
|---|---|
| Terraform provider + credentials setup | `references/recipes/provider-setup.md` |
| S3 backend + DynamoDB state locking | `references/recipes/tf-backend.md` |
| ECS Fargate/EC2 service deployment | `references/recipes/ecs-platform.md` |
| Lambda function deployment | `references/recipes/lambda-platform.md` |
| Static site with S3 + CloudFront | `references/recipes/static-site.md` |
| Ray cluster on EC2/EKS | `references/recipes/ray-clusters.md` |
| Firecracker MicroVM fleet | `references/recipes/firecracker-clusters.md` |
| Naming, tagging, module conventions | `references/recipes/infra-conventions.md` |

Load `provider-setup` + `tf-backend` whenever writing any AWS Terraform.
