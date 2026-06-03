# Dataset Versioning

## Why version datasets

Reproducibility requires knowing exactly which data trained which model. Without dataset versioning, debugging data drift is guesswork — you cannot compare model A's training data to model B's training data if neither was tracked. Auditing model behaviour (for compliance, fairness, or debugging) requires the ability to reconstruct the exact dataset used for any given model checkpoint.

Code versioning with git is standard practice. Dataset versioning is the same principle applied to data: every change to the training data should be tracked, reversible, and tied to a specific point in time.

## DVC (Data Version Control)

DVC is a git-like tool for data files. It stores lightweight pointer files (`.dvc` files) in git while the actual data lives in a remote storage backend (S3, GCS, Azure Blob, SSH, or local disk).

### Initial setup

```bash
# Initialize DVC in an existing git repository
git init && dvc init

# Track a dataset
dvc add data/train.parquet
git add data/.gitignore data/train.parquet.dvc
git commit -m "track training dataset"

# Configure remote storage (S3 example)
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc push
```

`dvc add` computes a hash of the file, moves it to a local cache, and creates a `.dvc` pointer file. The pointer file is small and committed to git. `dvc push` uploads the cached data to the remote.

### Pulling data on a new machine

```bash
git clone https://github.com/org/repo.git
cd repo
dvc pull  # downloads all tracked data from remote
```

`dvc pull` reads the `.dvc` pointer files and downloads the corresponding data from the configured remote. Teammates do not need to know where the data is stored — DVC resolves it from the remote configuration.

### DVC pipelines for versioned preprocessing

DVC pipelines define reproducible data processing stages with explicit dependency tracking.

```yaml
# dvc.yaml
stages:
  preprocess:
    cmd: python preprocess.py --input data/raw --output data/processed
    deps:
      - data/raw
      - preprocess.py
    outs:
      - data/processed
  train:
    cmd: python train.py --data data/processed --output models/model.pt
    deps:
      - data/processed
      - train.py
    outs:
      - models/model.pt
    metrics:
      - metrics.json:
          cache: false
```

`dvc repro` re-runs only stale stages — stages whose dependencies have changed since the last run. This avoids redundant computation when only part of the pipeline changes.

`dvc dag` visualizes the pipeline as a directed acyclic graph, showing the dependency chain from raw data to trained model.

### Tagging dataset versions

Use git tags to mark significant dataset milestones. This provides a human-readable way to reference specific dataset states.

```bash
git tag -a v1.0-dataset -m "initial curated dataset: 120k samples, quality-filtered"
git push origin v1.0-dataset

# Teammates reproduce the exact dataset:
git checkout v1.0-dataset
dvc checkout  # restores data files to match the tag
```

Tag naming convention: `v{N}.{M}-dataset` for standalone dataset releases, or include the dataset version in the model tag (`v1.0-model-datasetv2`).

### Comparing dataset versions

```bash
# Show what changed between two dataset versions
dvc diff v1.0-dataset v2.0-dataset

# List all tracked files and their hashes
dvc status
```

`dvc diff` reports added, deleted, and modified files between two git revisions. This is essential for understanding what changed in the data between two training runs.

## MLflow artifact storage for datasets

When the team already uses MLflow for experiment tracking, storing dataset snapshots as MLflow artifacts avoids introducing a second versioning tool.

```python
import mlflow

with mlflow.start_run():
    mlflow.log_artifact("data/train.parquet", artifact_path="datasets")
    mlflow.set_tag("dataset_version", "v1.0")
    mlflow.log_param("dataset_rows", 120000)
    mlflow.log_param("dataset_hash", "abc123...")
```

This approach ties each training run to the exact dataset used. The artifact is immutable — MLflow stores it in the configured artifact backend (S3, GCS, DBFS, or local filesystem) and it cannot be modified after logging.

The limitation is that MLflow artifacts are append-only and run-scoped. There is no built-in way to diff two dataset artifacts or to share a dataset across runs without duplicating storage. For datasets that change frequently and need diffing, DVC is the better choice.

## Delta Lake for mutable versioned tabular data

When the dataset is a large table that is frequently updated (new rows appended, corrections applied, rows deleted for privacy), Delta Lake provides versioned mutable storage with time travel.

**Reading a specific version.**

```python
df = spark.read.format("delta").option("versionAsOf", 3).load("s3://bucket/data")
```

**Reading as of a timestamp.**

```python
df = spark.read.format("delta").option("timestampAsOf", "2026-01-15").load("s3://bucket/data")
```

**Audit log.** Every operation on a Delta table is recorded in the transaction log.

```python
from delta.tables import DeltaTable

dt = DeltaTable.forPath(spark, "s3://bucket/data")
history = dt.history()  # returns DataFrame of all operations
history.select("version", "timestamp", "operation", "operationMetrics").show()
```

**Vacuum.** Old versions consume storage. `dt.vacuum(168)` removes files older than 168 hours (7 days) that are no longer referenced by any version. Set the retention period based on how far back you need to time-travel.

Delta Lake is best for large mutable tables where the dataset evolves continuously — streaming data ingestion, incremental labeling, or tables shared across multiple ML projects. It requires Spark or Delta-RS, which adds infrastructure complexity compared to DVC.

## When to use which

**DVC** for file-based datasets (Parquet files, image directories, text corpora). It integrates with git, requires no additional infrastructure beyond a storage backend, and supports pipeline reproducibility. Use DVC when the dataset is produced by a batch pipeline and changes infrequently (weekly or less).

**Delta Lake** for large mutable tabular datasets that change frequently. It provides ACID transactions, time travel, and schema enforcement. Use Delta Lake when the dataset is updated continuously (daily or more) and multiple teams read from the same table.

**MLflow artifacts** for run-specific dataset snapshots when the team already uses MLflow. It is the simplest approach but lacks diffing and deduplication. Use MLflow artifacts when the priority is tying each experiment to its exact dataset, not managing dataset evolution.

For most ML projects starting out, DVC is the right default. It is the simplest to set up, works with any file format, and provides the git-like workflow that engineers already understand.
