# Data Pipelines with Ray Data

## Why Ray Data

`torch.utils.data.DataLoader` loads data on a single machine. For datasets that don't fit in memory, or for preprocessing that is too slow to keep GPUs fed, Ray Data provides a distributed, lazy, streaming alternative.

Ray Data executes transformations in parallel across a Ray cluster, streams data without loading everything into memory at once, and integrates directly with Ray Train for GPU training. It replaces the combination of custom data loaders, multiprocessing hacks, and manual sharding that teams typically cobble together when PyTorch DataLoader hits its limits.

## Creating a dataset

All constructors return a `ray.data.Dataset` — a lazy, distributed abstraction that does not execute until iterated.

```python
import ray.data

# Columnar training data from Parquet (local or S3)
ds = ray.data.read_parquet("s3://bucket/data/")

# Flat CSV files
ds = ray.data.read_csv("data/train.csv")

# Image directories for computer vision
ds = ray.data.read_images("images/")

# Small in-memory datasets for testing
ds = ray.data.from_items([{"x": 1, "y": 0}, {"x": 2, "y": 1}])
```

For Parquet, Ray Data reads row groups in parallel and supports predicate pushdown — pass `filter=` to avoid reading unnecessary data from storage.

## Transformations

**`map_batches` is the primary transformation primitive.** The function receives a dict of numpy arrays (one key per column) and returns the same shape.

```python
def normalize(batch):
    batch["feature"] = (batch["feature"] - MEAN) / STD
    return batch

ds = ds.map_batches(normalize, batch_size=256)
```

`batch_size` controls memory pressure and throughput. Larger batches reduce per-batch overhead but increase memory usage. 256 is a good starting point for tabular data; 32-64 for images with large resolutions.

**Filtering rows.**

```python
ds = ds.filter(lambda row: row["label"] != -1)
```

**Row-level operations.** Use `ds.map(fn)` for operations that do not benefit from batching, such as string parsing or URL extraction.

## Feature engineering patterns

**Normalization.** Compute mean and standard deviation on a sample, then apply in `map_batches` with a closure that captures the statistics. Never fit the scaler on the full dataset inside the pipeline — fit once, apply always.

```python
# Compute stats on a sample
sample = ds.take(10_000)
mean = np.mean([row["feature"] for row in sample])
std = np.std([row["feature"] for row in sample])

# Apply in pipeline
def normalize(batch, mean=mean, std=std):
    batch["feature"] = (batch["feature"] - mean) / std
    return batch

ds = ds.map_batches(normalize, batch_size=256)
```

**Encoding categoricals.** Use `map_batches` with a pre-fit label encoder or one-hot encoder from sklearn. Store the encoder as an artifact alongside the model so it can be reused at inference time.

**Image augmentation.** Apply `torchvision.transforms` inside a `map_batches` function. Apply augmentation only on the training split — validation and test splits should use deterministic preprocessing.

## Validation split

```python
train_ds, val_ds = ds.train_test_split(test_size=0.1)
```

This produces a random 90/10 split. For stratified splits on imbalanced classes, group by label first with `ds.groupby("label")` and split each group, then concatenate the results.

## Writing to storage

```python
# Write distributed Parquet dataset
ds.write_parquet("s3://bucket/processed/")

# Write JSON for inspection
ds.write_json("output/")
```

Writing to storage materializes the lazy pipeline. Do this after all transformations are defined and validated. Writing triggers the full execution graph.

## Streaming to training

```python
ds.iter_torch_batches(
    batch_size=64,
    dtypes={"x": torch.float32, "label": torch.long},
)
```

This returns an iterator of PyTorch tensors. Use it as a drop-in replacement for a `DataLoader` inside a Ray Train `train_func`. Ray Data automatically prefetches and pipelines data loading with GPU computation, keeping the accelerator fed.

## Gotchas

**Operator fusion.** Ray Data fuses adjacent `map_batches` calls into a single pass. Do not split transformations into separate calls unless they need different `batch_size` or `num_cpus` settings — splitting defeats fusion and adds scheduling overhead.

**Shuffle vs local shuffle.** `ds.random_shuffle()` performs a full distributed shuffle. This is expensive but correct for training when global randomness matters. `ds.local_shuffle(buffer_size=1000)` shuffles within local buffers — cheap, and sufficient for most training scenarios where approximate randomness is acceptable.

**Schema inference.** Ray Data infers schema from the first block of data. If schema inference produces the wrong types (e.g., int64 instead of float32), pass `schema=` explicitly to `read_parquet`. This avoids silent type mismatches that surface as training errors downstream.
