# Experiment Tracking and Regression Prevention with MLflow

## Why MLflow

A spreadsheet of experiment results goes out of date within a week. It does not record the exact code version, the full set of hyperparameters, or the model artifact that produced the numbers. When someone asks "which model achieved 0.94 F1 and what was it trained on," the spreadsheet cannot answer.

MLflow tracks code version (via git commit hash), parameters, metrics, and artifacts atomically as a single run. Any result can be reproduced by checking out the recorded commit and loading the recorded artifact. This is the minimum bar for reproducible ML. Without it, every result is anecdotal.

## Setup

Install MLflow:

```bash
pip install mlflow
# or
uv add mlflow
```

**Local tracking (default).** MLflow writes to `mlruns/` in the current directory. No server needed for single-developer work. This is sufficient for personal experiments and prototyping.

**Pointing to a shared server.** Set the tracking URI to a remote server:

```python
import mlflow

mlflow.set_tracking_uri("http://localhost:5000")
```

**Running a tracking server for team sharing:**

```bash
mlflow server \
    --backend-store-uri postgresql://user:pw@host/mlflow \
    --default-artifact-root s3://bucket/mlflow/
```

The PostgreSQL backend stores run metadata (parameters, metrics, tags). S3 stores artifacts (model files, plots, datasets). The server UI is then available at `http://localhost:5000`.

## Runs

A run is the atomic unit of tracking. It records everything about a single experiment:

```python
import mlflow

with mlflow.start_run(run_name="baseline_v1") as run:
    mlflow.log_param("learning_rate", 1e-3)
    mlflow.log_param("batch_size", 64)
    mlflow.log_metric("val_loss", val_loss, step=epoch)
    mlflow.log_artifact("confusion_matrix.png")
```

**Parameters** are logged once per run and represent the configuration: hyperparameters, dataset version, preprocessing flags. **Metrics** can be logged at every step with `step=` to produce time-series charts in the UI. **Artifacts** are files: plots, model checkpoints, data samples.

**Tags** add free-form labels for filtering:

```python
mlflow.set_tag("model_type", "resnet50")
mlflow.set_tag("dataset_version", "v2.3")
```

`run.info.run_id` gives the unique identifier for programmatic access to the run after it completes.

## Auto-logging

For PyTorch and Lightning, one line of code enables comprehensive tracking:

```python
mlflow.pytorch.autolog()
```

Call this before training starts. Auto-logging captures: model summary (layer names and parameter counts), training metrics (loss and any metric returned by the training loop), optimizer parameters (learning rate, weight decay, momentum), and the trained model as an artifact.

This is the minimum setup for any PyTorch or Lightning training script. One line of code, comprehensive tracking. For Lightning specifically, `mlflow.pytorch.autolog()` integrates with Lightning's callback system automatically, capturing epoch-level metrics without any manual `mlflow.log_metric` calls.

## Model registry

The model registry provides versioned storage and lifecycle management for trained models.

**Registering a model:**

```python
mlflow.pytorch.log_model(
    model,
    "model",
    registered_model_name="fraud-detector",
)
```

The model is stored as an artifact and registered under a versioned name. Each call creates a new version under the same name.

**Staging lifecycle.** Models transition through stages:

`None` -> `Staging` -> `Production` -> `Archived`

```python
from mlflow import MlflowClient

client = MlflowClient()
client.transition_model_version_stage(
    name="fraud-detector",
    version="3",
    stage="Production",
)
```

`stage="Production"` is the signal to serving infrastructure that this version is live. Only one version per model should be in Production at a time. The previous Production version should be moved to Archived when a new one is promoted.

## Regression prevention

Comparing a new run to the Production model's metrics is the ML equivalent of a failing test suite. A model that performs worse than the current Production version should not be promoted.

The pattern has three steps:

**Step 1: Query the Production model's metrics.**

```python
client = MlflowClient()
prod_versions = client.get_latest_versions(
    "fraud-detector", stages=["Production"]
)
prod_version = prod_versions[0]
prod_run = client.get_run(prod_version.run_id)
prod_val_loss = prod_run.data.metrics["val_loss"]
```

**Step 2: Compare against the new run.**

```python
if new_val_loss > prod_val_loss * 1.05:
    raise ValueError(
        f"Regression: new val_loss {new_val_loss:.4f} is >5% worse "
        f"than Production {prod_val_loss:.4f}"
    )
```

The 5% threshold is a starting point. Adjust based on the metric's natural variance. A metric that fluctuates by 3% between identical runs needs a wider threshold.

**Step 3: Integrate into CI.** The training script exits non-zero if the regression threshold is crossed, failing the pipeline. This prevents accidental deployment of a worse model. The CI job should: train the model, run evaluation, compare against Production, and only proceed to promotion if the comparison passes.

## Searching runs

Query runs programmatically to find the best model across a sweep or audit which runs used a specific configuration:

```python
results = mlflow.search_runs(
    experiment_names=["fraud-detector"],
    filter_string=(
        'metrics.val_acc > 0.9 and params.batch_size = "64"'
    ),
    order_by=["metrics.val_loss ASC"],
)
```

This returns a pandas DataFrame of matching runs. The filter string supports `AND`/`OR` logic, comparison operators on metrics, and exact matching on parameters and tags. Use this to find the best run across a hyperparameter sweep, or to audit which runs used a specific dataset version.
