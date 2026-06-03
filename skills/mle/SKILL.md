---
name: mle
description: 'ML engineering lifecycle: data pipelines with Ray Data, distributed training with Ray Train, model evaluation, TensorBoard observability, MLflow experiment tracking, and model publishing. Triggers on: "mle", "ml engineering", "data pipeline", "distributed training", "model evaluation", "mlflow", "tensorboard", "model publishing".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
experimental: true
---

# mle · experimental

Context skill for the full ML engineering lifecycle: research, data pipelines, distributed training, evaluation, observability, and model publishing.

## Philosophy

ML engineering is a systems problem, not just a modeling problem. A model that trains but can't be reproduced, monitored, or deployed is an experiment, not an asset. These recipes treat the entire lifecycle — from data ingestion to production serving — as an engineering system with the same rigour applied to any other distributed system: versioning, observability, regression prevention, and fault tolerance.

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
