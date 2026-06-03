---
title: aws
---

# aws

Context skill for AWS infrastructure patterns with Terraform — activates automatically, no slash command needed.

## Requirements

- `aws` CLI — [AWS CLI installation](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- `terraform` CLI — [terraform.io downloads](https://developer.hashicorp.com/terraform/install)

## Commands

This is a context skill. It activates automatically when `.tf` files targeting AWS, `AWS_` environment variables, or an AWS Terraform provider are detected. No slash command is needed.

### Trigger conditions

The skill loads when any of the following are present:

- `.tf` or `.tfvars` files in the project
- Environment variables prefixed `AWS_` (e.g. `AWS_DEFAULT_REGION`) in `mise.toml`
- A Terraform provider block referencing `hashicorp/aws`
- User mentions ECS, Lambda, S3, CloudFront, EC2, EKS, or AWS

### Recipes available

| Situation | Recipe loaded |
|---|---|
| Terraform provider and credentials setup | `provider-setup` |
| S3 backend and DynamoDB state locking | `tf-backend` |
| ECS Fargate or EC2 service deployment | `ecs-platform` |
| Lambda function deployment | `lambda-platform` |
| Static site with S3 and CloudFront | `static-site` |
| Ray cluster on EC2 or EKS | `ray-clusters` |
| Firecracker MicroVM fleet | `firecracker-clusters` |
| Naming, tagging, and module conventions | `infra-conventions` |

`provider-setup` and `tf-backend` are loaded whenever any AWS Terraform is being written.

Each recipe loads on demand — only what is relevant to the current task.

## References

- [AWS CLI documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
- [Terraform AWS Provider documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
