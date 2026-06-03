# Self-Hosting Label Studio

## When to self-host

Label Studio Cloud works for small teams with public data. Self-hosting becomes necessary when data cannot leave the network (healthcare, finance, government), when annotation volume makes per-task pricing expensive, when the team needs custom annotation interfaces beyond what the cloud product offers, or when the annotation workflow must integrate with an existing CI/CD pipeline.

Self-hosting gives full control over data residency, user management, and export automation. The tradeoff is operational responsibility for uptime, backups, and upgrades.

## Docker Compose setup

The simplest deployment uses SQLite for the database and local disk for file storage.

```yaml
version: "3.8"
services:
  label-studio:
    image: heartexlabs/label-studio:latest
    ports: ["8080:8080"]
    environment:
      - DJANGO_DB=sqlite
      - LABEL_STUDIO_HOST=http://localhost:8080
      - LOCAL_FILES_SERVING_ENABLED=true
    volumes:
      - ./label-studio-data:/label-studio/data
```

Run with `docker compose up -d`. The web interface is available at `http://localhost:8080`. First-time setup prompts for an admin account.

### Production configuration

For production use PostgreSQL instead of SQLite (SQLite does not support concurrent writes from multiple workers) and S3 or GCS for file storage.

```yaml
version: "3.8"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: label_studio
      POSTGRES_USER: ls_user
      POSTGRES_PASSWORD: "${LS_DB_PASSWORD}"
    volumes:
      - pgdata:/var/lib/postgresql/data

  label-studio:
    image: heartexlabs/label-studio:latest
    ports: ["8080:8080"]
    depends_on: [db]
    environment:
      - DJANGO_DB=default
      - POSTGRE_HOST=db
      - POSTGRE_PORT=5432
      - POSTGRE_NAME=label_studio
      - POSTGRE_USER=ls_user
      - POSTGRE_PASSWORD=${LS_DB_PASSWORD}
      - LABEL_STUDIO_HOST=https://labels.example.com
      - STORAGE_TYPE=s3
      - STORAGE_AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - STORAGE_AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - STORAGE_AWS_BUCKET_NAME=${S3_BUCKET}
    volumes:
      - ./label-studio-data:/label-studio/data

volumes:
  pgdata:
```

Use environment variable substitution for secrets. Never hardcode credentials in the Compose file.

## Connecting cloud storage

Cloud storage allows annotators to access data without downloading it to the Label Studio server.

**S3 source storage.** In the Label Studio UI: Settings > Cloud Storage > Add Source Storage > Amazon S3. Provide the bucket name, prefix (subfolder), and IAM credentials. The Sync button triggers an import of all matching files. Enable "Treat every bucket object as a source file" for flat file structures.

For continuous ingestion, enable auto-sync. Label Studio polls the bucket at a configurable interval and imports new files automatically. This is useful when an upstream pipeline writes new data to S3 on a schedule.

**GCS.** The setup is identical except the storage type is Google Cloud Storage and authentication uses a service account JSON key.

## Project templates by task type

Label Studio uses XML-based labeling configurations. Each project type has a standard template.

**Text classification.**

```xml
<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text" choice="single">
    <Choice value="positive"/>
    <Choice value="negative"/>
    <Choice value="neutral"/>
  </Choices>
</View>
```

**Named entity recognition (NER).**

```xml
<View>
  <Labels name="ner" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="blue"/>
    <Label value="LOC" background="green"/>
  </Labels>
  <Text name="text" value="$text"/>
</View>
```

**Image classification.**

```xml
<View>
  <Image name="image" value="$image"/>
  <Choices name="class" toName="image" choice="single">
    <Choice value="cat"/>
    <Choice value="dog"/>
  </Choices>
</View>
```

**Bounding boxes for object detection.**

```xml
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="car"/>
    <Label value="person"/>
    <Label value="bicycle"/>
  </RectangleLabels>
</View>
```

**Image segmentation with brush labels.**

```xml
<View>
  <Image name="image" value="$image"/>
  <BrushLabels name="mask" toName="image">
    <Label value="foreground"/>
    <Label value="background"/>
  </BrushLabels>
</View>
```

## Exporting labeled data

Label Studio supports multiple export formats. Choose the format that matches the downstream training framework.

- **COCO** — standard for object detection and segmentation; compatible with Detectron2, MMDetection, and torchvision
- **YOLO** — text-based format for YOLO family models; one `.txt` file per image with class and bounding box coordinates
- **JSON-MIN** — lightweight JSON with only the essential fields; best for custom pipelines that parse annotations programmatically

### Automated export via the API

The Label Studio SDK enables programmatic export, which is essential for CI/CD integration.

```python
import label_studio_sdk

ls = label_studio_sdk.Client("http://localhost:8080", api_key="YOUR_KEY")
project = ls.get_project(1)

# Export all completed annotations
export = project.export_tasks(export_type="JSON_MIN")

# Export in COCO format for object detection
coco_export = project.export_tasks(export_type="COCO")
```

Store the API key as a secret in the CI/CD system. Do not hardcode it in scripts.

### Filtering exports

Export only tasks that meet quality criteria — for example, tasks with at least two agreeing annotations (for inter-annotator agreement) or tasks completed after a specific date.

```python
import json

tasks = project.export_tasks(export_type="JSON_MIN")
# Keep only tasks with >= 2 annotations
filtered = [t for t in tasks if len(t.get("annotations", [])) >= 2]

with open("labeled_data.json", "w") as f:
    json.dump(filtered, f)
```

## CI/CD integration

After an annotation sprint completes, automate the pipeline: export labeled data, convert to the training format, version the dataset with DVC, and trigger a training run.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Export from Label Studio
python export_labels.py --project-id 1 --format JSON_MIN --output data/labeled.json

# 2. Convert to training format
python convert_to_parquet.py --input data/labeled.json --output data/train.parquet

# 3. Version with DVC
dvc add data/train.parquet
git add data/train.parquet.dvc
git commit -m "dataset: update labeled data $(date +%Y-%m-%d)"
dvc push

# 4. Trigger training (optional)
# python train.py --data data/train.parquet
```

Run this script as a GitHub Action or GitLab CI job triggered manually or on a schedule. The key insight is that annotation is an ongoing process — the export-version-train loop should be automated so that new labels flow into models without manual intervention.

## Quality assurance for annotations

**Inter-annotator agreement.** Assign the same tasks to multiple annotators and measure agreement (Cohen's kappa for two annotators, Fleiss' kappa for more). Low agreement indicates ambiguous labeling guidelines — fix the guidelines before collecting more labels.

**Review workflow.** Label Studio supports a review stage where a senior annotator approves or rejects annotations. Enable this for high-stakes datasets where label quality directly impacts model safety.

**Active learning loop.** Use the model's predictions to prioritize which samples to annotate next — annotate the samples where the model is most uncertain. This maximizes the information gained per annotation and reduces total annotation cost.
