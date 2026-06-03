---
title: terraform
---

# terraform

Context skill for Terraform infrastructure patterns — activates automatically, no slash command needed.

## Requirements

- `terraform` CLI — [terraform.io downloads](https://developer.hashicorp.com/terraform/install)

## Commands

This is a context skill. It activates automatically when `.tf` files are detected. No slash command is needed.

### Trigger conditions

The skill loads when any of the following are present:

- `.tf` or `.tfvars` files in the project
- User mentions Terraform, `tf-init`, `tf-plan`, or `tf-apply`
- An `infra/` directory containing Terraform configuration

### Recipes available

| Situation | Recipe loaded |
|---|---|
| Directory structure and module layout | `structure` |
| GCP backend (GCS) and workspace management | `gcp-backend-workspaces` |
| GCP variable and tfvars management | `gcp-variables` |
| AWS backend (S3) and workspace management | `aws-backend-workspaces` |
| AWS variable and provider setup | `aws-variables` |

For mise task wrappers (`tf-init`, `tf-plan`, `tf-apply`, `tf-destroy`) see the [mise skill](/skills/mise) — recipes `terraform-gcp` and `terraform-aws`.

Each recipe loads on demand — only what is relevant to the current task.

## References

- [Terraform documentation](https://developer.hashicorp.com/terraform/docs)
- [Terraform language reference](https://developer.hashicorp.com/terraform/language)
