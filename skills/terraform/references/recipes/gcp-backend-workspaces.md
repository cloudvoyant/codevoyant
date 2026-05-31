# Backend & Workspace Management

## GCS Backend

A single GCS bucket holds state for all projects and environments:

```
Bucket:  ${GCP_DEVOPS_PROJECT_ID}-terraform-backend-storage
Prefix:  ${GCP_PROJECT_ID}/${PROJECT}

State paths:
  my-gcp-project/app1/env:/dev/default.tfstate
  my-gcp-project/app1/env:/stage/default.tfstate
  my-gcp-project/app1/env:/prod/default.tfstate
  my-gcp-project/app1/shared/default.tfstate
```

Backend stub — config passed at init time via `-backend-config`:

```hcl
# infra/environments/backend.tf
terraform {
  backend "gcs" {}
}
```

## Workspace-per-Environment

Workspaces: `dev`, `stage`, `prod`, `preview-{issue-id}`

```bash
terraform workspace list
terraform workspace select dev
terraform workspace new preview-123
```

`mise run tf-init <workspace>` handles select/new automatically.

## tf-init (mise task)

The `tf-init` task:
1. Resolves bucket name from `${GCP_DEVOPS_PROJECT_ID}-terraform-backend-storage`
2. Resets `.terraform/environment` to `default` (prevents stale workspace prompts in CI)
3. Runs `terraform init -reconfigure -backend-config=bucket=... -backend-config=prefix=...`
4. Selects or creates the workspace

```bash
mise run tf-init dev      # initialize for dev workspace
mise run tf-init prod     # initialize for prod
mise run tf-init          # infers workspace from git branch
```

Always run `tf-init` before `tf-plan` or `tf-apply` — the mise tasks do this automatically via `depends`.

## Creating the Backend Bucket

Run once per devops project via the `tf-create-backend` mise task — never create the bucket manually:

```bash
mise run tf-create-backend
```

The task is **idempotent** — safe to re-run if the bucket already exists. It creates the bucket with:

- **Versioning enabled** — allows recovery from bad state applies
- **Delete protection** — prevents accidental bucket deletion (`gsutil retention lock`)
- **Uniform bucket-level access** — no per-object ACLs

Example `tf-create-backend` task:

```bash
#!/usr/bin/env bash
#MISE description="Create GCS Terraform backend bucket (idempotent, delete-protected)"
BUCKET="${GCP_DEVOPS_PROJECT_ID}-terraform-backend-storage"

if gsutil ls -b "gs://${BUCKET}" > /dev/null 2>&1; then
  echo "Backend bucket already exists: ${BUCKET}"
else
  gsutil mb -p "${GCP_DEVOPS_PROJECT_ID}" -l "${GCP_DEVOPS_PROJECT_REGION}" "gs://${BUCKET}"
  gsutil versioning set on "gs://${BUCKET}"
  gsutil ubla set on "gs://${BUCKET}"
  echo "Created backend bucket: ${BUCKET}"
fi

# Ensure retention/delete protection is set (idempotent)
gsutil retention lock "gs://${BUCKET}" 2>/dev/null || true
echo "Backend bucket ready: gs://${BUCKET}"
```

## Shared Infrastructure

`infra/shared/` has its own init/apply cycle:

```bash
mise run tf-init-shared
mise run tf-apply-shared
```

Apply shared resources once before any environment deployments. Shared state lives at `${PREFIX}/shared/default.tfstate`.
