# GCP Artifact Registry

Pushing Docker images to GCP Artifact Registry and deploying to Cloud Run.

## Image Naming Convention

```
{REGION}-docker.pkg.dev/{PROJECT_ID}/{REGISTRY_NAME}/{IMAGE_NAME}:{TAG}
```

From nv-gcp-template env vars:

```toml
[env]
GCP_DEVOPS_PROJECT_ID        = "devops-466002"
GCP_DEVOPS_PROJECT_REGION    = "us-east1"
GCP_DEVOPS_DOCKER_REGISTRY_NAME = "cloudvoyant-docker-registry"
PROJECT = "my-app"
VERSION = "{{ exec(command='cat version.txt') }}"
```

Full image name:
```
us-east1-docker.pkg.dev/devops-466002/cloudvoyant-docker-registry/my-app-web:1.2.3
```

## Authentication

```toml
[tasks.gcp-login]
description = "Authenticate Docker with GCP Artifact Registry"
run         = """
gcloud auth configure-docker ${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev --quiet
echo "✓ Authenticated with ${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev"
"""
```

Or using a service account key (CI):

```bash
echo "$GCP_SA_KEY" | docker login \
  -u _json_key \
  --password-stdin \
  "${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev"
```

## Push Tasks

```toml
[tasks.docker-push]
description = "Push web image to GCP Artifact Registry"
run         = """
IMAGE="${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION}"
docker tag ${PROJECT}-web:local "$IMAGE"
docker push "$IMAGE"
echo "✓ Pushed: $IMAGE"
"""

[tasks.docker-push-rc]
description = "Push release candidate image"
run         = """
IMAGE="${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION}-rc"
docker tag ${PROJECT}-web:local "$IMAGE"
docker push "$IMAGE"
echo "✓ Pushed RC: $IMAGE"
"""
```

## docker-compose.yml image naming

Set the `image:` field to the full registry path — `docker compose push` and `docker compose pull` will use it:

```yaml
services:
  web:
    image: ${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION:-latest}
```

## Cloud Run Deploy

```toml
[tasks.deploy]
description = "Deploy to Cloud Run"
depends     = ["docker-push"]
run         = """
IMAGE="${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION}"
gcloud run deploy ${PROJECT}-web \
  --image "$IMAGE" \
  --region "${GCP_PROJECT_REGION}" \
  --project "${GCP_PROJECT_ID}" \
  --platform managed \
  --allow-unauthenticated \
  --quiet
echo "✓ Deployed to Cloud Run"
"""

[tasks."deploy:force"]
description = "Force redeploy without building a new image"
run         = """
gcloud run services update ${PROJECT}-web \
  --region "${GCP_PROJECT_REGION}" \
  --project "${GCP_PROJECT_ID}" \
  --quiet
"""
```

## Pull from Registry (for CI or other environments)

```bash
# Authenticate
gcloud auth configure-docker ${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev --quiet

# Pull
docker pull "${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION}"
```

## Creating the Artifact Registry (Terraform)

In your `infra/` Terraform config:

```hcl
resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = "cloudvoyant-docker-registry"
  format        = "DOCKER"
}
```

Apply with `mise run tf-apply`.
