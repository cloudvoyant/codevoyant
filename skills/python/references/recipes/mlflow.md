# Experiment Tracking with MLflow

## Why this matters

Machine learning experiments are notoriously hard to reproduce. Without tracking, you end up with a folder of model files named `model_v2_final_FINAL.pkl` and no idea what hyperparameters, data, or code produced each one. MLflow solves this by recording every run's parameters, metrics, and artifacts in a queryable store so you can compare runs, find the best model, and promote it to production with confidence.

This recipe covers: the tracking API, model logging, the model registry, and integration with Ray distributed training.


## Install

```bash
uv add "mlflow>=2.16"               # core client + server
uv add "mlflow[extras]"             # adds boto3, psycopg2, mysqlclient
uv add scikit-learn pandas          # whatever your training framework needs
```

```toml
[project]
dependencies = [
  "mlflow>=2.16",
  "scikit-learn>=1.5",
  "boto3>=1.34",          # if logging artifacts to S3
  "psycopg2-binary>=2.9", # if the backend store is Postgres
]
```

MLflow >= 2.16 has native uv support — `mlflow.<flavor>.log_model()` copies `uv.lock`, `pyproject.toml`, and `.python-version` into the model artifact, so consumers can `uv sync` for an exact environment restore.


## Minimal Working Example

Set the tracking URI and experiment, then wrap the training loop in a context manager. The context manager guarantees `end_run(status=...)` is called even if training crashes.

```python
import mlflow

mlflow.set_tracking_uri("http://mlflow.internal:5000")
mlflow.set_experiment("fraud-detection")

with mlflow.start_run(run_name="rf-baseline") as run:
    mlflow.log_param("n_estimators", 200)
    mlflow.log_params({"max_depth": 8, "min_samples_split": 5})

    for epoch in range(num_epochs):
        loss = train_step()
        mlflow.log_metric("train_loss", loss, step=epoch)

    mlflow.log_metrics({"val_auc": 0.92, "val_f1": 0.88})
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.log_artifacts("./reports")     # entire directory
    mlflow.set_tags({"team": "risk", "owner": "skapoor"})
```

The fluent API (`mlflow.log_*`) is **not thread-safe**. Serialize concurrent log calls, or use one `MlflowClient` per thread.


## Autolog, Nested Runs, and Search

See the [MLflow tracking docs](https://mlflow.org/docs/latest/tracking.html) for the full API — here's what matters for our projects:

**Autolog:** call `mlflow.autolog()` before training for sklearn, PyTorch, LightGBM, XGBoost, or transformers. Add manual `mlflow.log_metric(...)` calls alongside it for custom metrics. Autolog is off by default — don't rely on it being called elsewhere; call it explicitly at the top of each training script.

**Nested runs:** use `with mlflow.start_run(nested=True)` to group hyperparameter sweep trials under a parent run. Keep the parent run open for the entire sweep; children close automatically.

**Search runs:** `mlflow.search_runs(experiment_names=[...], filter_string="metrics.val_auc > 0.9", order_by=["metrics.val_auc DESC"])` returns a DataFrame. Use this in post-sweep analysis scripts rather than querying the UI manually.


## Logging Models — Built-in Flavors

### sklearn

```python
from mlflow.models.signature import infer_signature

signature = infer_signature(X_train, model.predict(X_train))
mlflow.sklearn.log_model(
    sk_model=model,
    name="model",                                # artifact path within run
    signature=signature,
    input_example=X_train.iloc[:5],
    registered_model_name="fraud-rf",            # also registers to the model registry
)
```

### PyTorch

```python
mlflow.pytorch.log_model(
    pytorch_model=net,
    name="model",
    pip_requirements=["torch==2.4.0", "torchvision==0.19.0"],
    signature=infer_signature(x_sample.numpy(), net(x_sample).detach().numpy()),
)
```

### Load any flavor as pyfunc

```python
model = mlflow.pyfunc.load_model("models:/fraud-rf@champion")
preds = model.predict(X_new)
```


## Custom Flavor — `pyfunc.PythonModel`

Use this when your inference logic isn't a single estimator — for example, an ensemble with pre/post-processing steps, or an LLM agent.

```python
import mlflow
import pandas as pd

class FraudEnsemble(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        import joblib
        self.preproc = joblib.load(context.artifacts["preproc"])
        self.rf      = joblib.load(context.artifacts["rf"])
        self.xgb     = joblib.load(context.artifacts["xgb"])

    def predict(self, context, model_input: pd.DataFrame, params=None):
        X = self.preproc.transform(model_input)
        p = 0.5 * self.rf.predict_proba(X)[:, 1] + 0.5 * self.xgb.predict_proba(X)[:, 1]
        return (p > (params or {}).get("threshold", 0.5)).astype(int)


with mlflow.start_run():
    mlflow.pyfunc.log_model(
        name="ensemble",
        python_model=FraudEnsemble(),
        artifacts={
            "preproc": "artifacts/preproc.joblib",
            "rf":      "artifacts/rf.joblib",
            "xgb":     "artifacts/xgb.joblib",
        },
        pip_requirements=["scikit-learn>=1.5", "xgboost>=2.0", "pandas>=2.2"],
        signature=infer_signature(X_sample, [0]),
    )
```


## Model Registry

The model registry is the promotion path from experiment to production. Register a model version, then assign aliases to it. Downstream services load by alias, so promoting a new version is a one-line alias update rather than a config change.

### Register (two ways)

```python
# 1. At log time
mlflow.sklearn.log_model(sk_model=model, name="model",
                         registered_model_name="fraud-rf")

# 2. After the fact
mlflow.register_model("runs:/<run_id>/model", "fraud-rf")
```

### Aliases (preferred over deprecated stages)

```python
from mlflow import MlflowClient
client = MlflowClient()

client.set_registered_model_alias("fraud-rf", "champion",   version=7)
client.set_registered_model_alias("fraud-rf", "challenger", version=8)

prod = mlflow.pyfunc.load_model("models:/fraud-rf@champion")
```

### Tags and description

```python
client.set_registered_model_tag("fraud-rf", "task", "binary-classification")
client.set_model_version_tag("fraud-rf", "7", "validation_status", "approved")
client.update_model_version("fraud-rf", 7,
    description="100 trees, depth 8, 2026-06 retrain")
```

### Stages (deprecated but still seen in older code)

```python
client.transition_model_version_stage(
    name="fraud-rf", version=7, stage="Production",
    archive_existing_versions=True,
)
mlflow.pyfunc.load_model("models:/fraud-rf/Production")
```

Prefer aliases for new code. Stages are deprecated and will be removed.

### Cross-environment promotion

```python
client.copy_model_version(
    src_model_uri="models:/fraud-rf-staging@candidate",
    dst_name="fraud-rf-prod",
)
```


## Tracking Server Topologies

See the [MLflow tracking server docs](https://mlflow.org/docs/latest/tracking/server.html) for the full server reference — here's the topology progression we use:

- **Local dev:** `mlflow.set_tracking_uri("file:./mlruns")` — no server needed, runs recorded to local `mlruns/`. Don't commit `mlruns/`.
- **Shared team server:** Postgres backend-store + S3 artifact store, deployed as a container. Always run with `--serve-artifacts` so training clients only need `MLFLOW_TRACKING_URI` and never touch S3 credentials directly.
- **Promotion gate:** use the model registry (aliases below), not a separate staging server. One server, multiple environments via alias (`@champion`, `@challenger`, `@staging`).

The deciding factor for graduating to a shared server: the moment a second person needs to compare runs or load a registered model.


## Ray Train Integration

### Pattern A — `MLflowLoggerCallback` (driver-side, simplest)

```python
from ray import tune
from ray.air.integrations.mlflow import MLflowLoggerCallback

tuner = tune.Tuner(
    train_fn,
    tune_config=tune.TuneConfig(num_samples=20),
    run_config=tune.RunConfig(
        name="hp-sweep",
        callbacks=[MLflowLoggerCallback(
            tracking_uri="http://mlflow.internal:5000",
            experiment_name="ray-sweep",
            tags={"owner": "skapoor"},
            save_artifact=True,
        )],
    ),
    param_space={"lr": tune.loguniform(1e-4, 1e-1), "depth": tune.randint(3, 12)},
)
results = tuner.fit()
```

### Pattern B — `setup_mlflow` (worker-side, fine-grained)

```python
from ray.air.integrations.mlflow import setup_mlflow

def train_fn(config):
    mlflow = setup_mlflow(
        config,
        experiment_name="ray-fn",
        tracking_uri="http://mlflow.internal:5000",
        # rank_zero_only=True is default — only rank 0 logs
    )
    mlflow.autolog()
    for step in range(100):
        loss = step_train()
        mlflow.log_metric("loss", loss, step=step)
        tune.report({"loss": loss})
```

In distributed Ray Train, only the rank-0 worker logs (other ranks receive a noop client). Don't coordinate logging from multiple ranks.


## Environment Variables

| Env var | Purpose |
| --- | --- |
| `MLFLOW_TRACKING_URI` | server URL or `file:./mlruns` |
| `MLFLOW_EXPERIMENT_NAME` | default experiment for `start_run()` |
| `MLFLOW_S3_ENDPOINT_URL` | custom S3 endpoint (MinIO etc.) |
| `MLFLOW_TRACKING_TOKEN` | bearer token for an auth-proxied server |
| `MLFLOW_REGISTRY_URI` | separate URI for registry (default = tracking) |
| `MLFLOW_ENABLE_SYSTEM_METRICS_LOGGING` | `true` to autolog CPU/GPU/RAM |


## Common Pitfalls

- Fluent API is not thread-safe — for concurrent log calls use one `MlflowClient` per thread
- Stages (`Production`, `Staging`) are deprecated — use aliases (`@champion`) for new code
- `mlflow.<flavor>.log_model(... name=...)` is the current arg; older docs show `artifact_path=` — both still work but `name` is canonical
- Without `--serve-artifacts`, every training client needs S3 credentials — set the flag on the server to keep client config minimal
- A model version's `pip_requirements` must list the exact framework version used at training time, or `pyfunc.load_model` may install a different release that breaks inference
