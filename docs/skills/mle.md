---
title: mle
---

# mle · experimental

> This skill is experimental. Recipes cover the ML engineering lifecycle but assume familiarity with PyTorch and Python packaging.

Context skill for the full ML engineering lifecycle: research, data pipelines, distributed training, model evaluation, observability, and model publishing.

## Requirements

- Python 3.11+
- `uv` — Python package and project manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- CUDA toolkit — optional; required for GPU training recipes

## Philosophy

ML engineering is a systems problem, not just a modeling problem. A model that trains but can't be reproduced, monitored, or deployed is an experiment, not an asset. These recipes treat the entire lifecycle as an engineering system: versioning, observability, regression prevention, and fault tolerance built in from the start.

## Recipes

- [Researching a New Problem Domain](./mle/recipes/domain-research) — literature review, dataset discovery, baseline establishment, problem framing
- [Data Pipelines with Ray Data](./mle/recipes/data-pipelines) — distributed loading, transformation, feature engineering, streaming to training
- [Storage Formats for ML](./mle/recipes/storage-formats) — Parquet, Arrow, HDF5, LMDB; when to use each; dataset versioning
- [Distributed Training with Ray Train](./mle/recipes/distributed-training) — DDP with Ray, Lightning integration, fault tolerance
- [Model Training and Evaluation](./mle/recipes/model-training-eval) — training loop patterns, validation strategy, metrics, early stopping
- [Observability with TensorBoard and Lightning](./mle/recipes/tensorboard-lightning) — logging metrics, gradients, images; comparing runs; profiling
- [Experiment Tracking with MLflow](./mle/recipes/mlflow-tracking) — runs, model registry, regression prevention, CI integration
- [Model Publishing](./mle/recipes/model-publishing) — ONNX, TorchScript, MLflow registry, Ray Serve, FastAPI

## References

- [Ray Train](https://docs.ray.io/en/latest/train/train.html)
- [Ray Data](https://docs.ray.io/en/latest/data/data.html)
- [MLflow documentation](https://mlflow.org/docs/latest/)
- [PyTorch Lightning](https://lightning.ai/docs/pytorch/stable/)
- [TensorBoard](https://www.tensorflow.org/tensorboard)
- [ONNX](https://onnx.ai/)
