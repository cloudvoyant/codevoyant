# Data Loaders

## Why data loading matters

GPU utilization drops when the data pipeline cannot feed batches fast enough. A model that trains at 80% GPU utilization because of slow data loading is wasting 20% of compute budget. The data loader is the bridge between storage and the training loop — getting it right means the GPU never waits for data.

Different frameworks have different loading patterns. PyTorch gives fine-grained control but requires manual setup. HuggingFace Datasets handles NLP and multimodal data with built-in streaming and tokenizer integration. scikit-learn provides simple utilities for small tabular datasets. Choose the loader that matches the framework and data scale.

## PyTorch DataLoader

The core primitive for feeding data into a PyTorch training loop.

### Basic Dataset and DataLoader

```python
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import torch

class ParquetDataset(Dataset):
    def __init__(self, path):
        self.df = pd.read_parquet(path)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        return {
            "input": torch.tensor(row["features"], dtype=torch.float32),
            "label": torch.tensor(row["label"], dtype=torch.long),
        }

dataset = ParquetDataset("data/train.parquet")
loader = DataLoader(
    dataset,
    batch_size=32,
    num_workers=4,
    pin_memory=True,
    prefetch_factor=2,
    persistent_workers=True,
)
```

### DataLoader parameters explained

**`num_workers`** controls how many subprocesses load data in parallel. Set this to the number of CPU cores available divided by the number of GPUs. With 8 CPUs and 1 GPU, use `num_workers=4` to `8`. Too many workers cause CPU contention; too few starve the GPU. Zero workers means data is loaded in the main process — useful only for debugging.

**`pin_memory=True`** allocates tensors in pinned (page-locked) CPU memory, which enables faster CPU-to-GPU transfer via `cudaMemcpyAsync`. Always enable this when training on GPU. The memory overhead is negligible compared to the speedup.

**`prefetch_factor`** controls how many batches each worker pre-loads. The default is 2, meaning each worker has 2 batches ready ahead of time. Increase this if the GPU still waits for data (visible as low GPU utilization in `nvidia-smi`). Higher values use more CPU memory.

**`persistent_workers=True`** keeps worker processes alive between epochs instead of respawning them. This avoids the overhead of process creation and dataset re-initialization at every epoch boundary. Always enable this unless the dataset changes between epochs.

### Custom collate for variable-length sequences

When samples have different lengths (text sequences, time series), the default collate function fails because it cannot stack tensors of different shapes. Write a custom collate function that pads sequences to the same length.

```python
from torch.nn.utils.rnn import pad_sequence

def collate_fn(batch):
    inputs = pad_sequence(
        [b["input"] for b in batch],
        batch_first=True,
        padding_value=0,
    )
    labels = torch.stack([b["label"] for b in batch])
    return {"input": inputs, "label": labels}

loader = DataLoader(dataset, batch_size=32, collate_fn=collate_fn)
```

`pad_sequence` pads all tensors in the list to the length of the longest tensor. `batch_first=True` returns shape `(batch, seq_len, ...)` which is what most models expect. Record the original lengths if the model needs to ignore padding (for attention masks or pack_padded_sequence).

### IterableDataset for streaming

When the dataset is too large to fit in memory or is generated on-the-fly, use `IterableDataset` instead of `Dataset`.

```python
from torch.utils.data import IterableDataset

class StreamingParquetDataset(IterableDataset):
    def __init__(self, paths):
        self.paths = paths

    def __iter__(self):
        worker_info = torch.utils.data.get_worker_info()
        if worker_info is not None:
            # Split files across workers
            per_worker = len(self.paths) // worker_info.num_workers
            start = worker_info.id * per_worker
            paths = self.paths[start:start + per_worker]
        else:
            paths = self.paths

        for path in paths:
            df = pd.read_parquet(path)
            for _, row in df.iterrows():
                yield {
                    "input": torch.tensor(row["features"], dtype=torch.float32),
                    "label": torch.tensor(row["label"], dtype=torch.long),
                }
```

The key detail is splitting work across workers using `get_worker_info()`. Without this, every worker yields the entire dataset, producing duplicated batches.

## scikit-learn dataset loading

For small tabular datasets used with scikit-learn models.

### Built-in datasets

```python
from sklearn.datasets import fetch_openml, load_iris
from sklearn.model_selection import train_test_split

# Small built-in datasets
X, y = load_iris(return_X_y=True)

# OpenML datasets (downloads from the internet)
X, y = fetch_openml("mnist_784", return_X_y=True, as_frame=False)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
```

`stratify=y` ensures the class distribution in the train and test splits matches the original dataset. Always use this for classification tasks with imbalanced classes.

### Custom datasets with Bunch

For drop-in compatibility with sklearn's API, wrap custom data in a `Bunch` object.

```python
from sklearn.utils import Bunch
import pandas as pd

df = pd.read_parquet("data/train.parquet")
dataset = Bunch(
    data=df.drop(columns=["label"]).values,
    target=df["label"].values,
    feature_names=list(df.drop(columns=["label"]).columns),
    target_names=["negative", "positive"],
)
```

This works with any sklearn utility that expects a dataset object.

## HuggingFace Datasets

The best way to load NLP and multimodal data. HuggingFace Datasets provides a unified API for public datasets, local files, and streaming, with built-in integration for tokenizers and the Trainer API.

### Loading public datasets

```python
from datasets import load_dataset

# Full dataset in memory
ds = load_dataset("imdb", split="train")

# Specific split with a subset
ds = load_dataset("glue", "mrpc", split="train[:1000]")
```

### Streaming for large datasets

Streaming mode never downloads the full dataset. Data is loaded on-demand as the iterator advances. This is essential for datasets that do not fit on disk (Common Crawl, The Pile, C4).

```python
ds = load_dataset("c4", "en", split="train", streaming=True)

for example in ds:
    # process one example at a time
    text = example["text"]
    break
```

### Loading local files

```python
# Parquet files
ds = load_dataset("parquet", data_files={"train": "train.parquet", "test": "test.parquet"})

# CSV files
ds = load_dataset("csv", data_files="data/*.csv")

# JSON lines
ds = load_dataset("json", data_files="data/train.jsonl")
```

### Map and filter with multiprocessing

```python
ds = ds.map(lambda ex: {"text": ex["text"].lower()}, num_proc=4)
ds = ds.filter(lambda ex: len(ex["text"]) > 100, num_proc=4)
```

`num_proc` controls parallelism. HuggingFace Datasets caches the result of `map` and `filter` to disk using Arrow format — subsequent calls with the same function and dataset skip recomputation entirely.

### Integration with tokenizers

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

def tokenize(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=512)

ds = ds.map(tokenize, batched=True, num_proc=4)
ds.set_format("torch", columns=["input_ids", "attention_mask", "label"])
```

`set_format("torch")` converts the dataset columns to PyTorch tensors on-the-fly. This avoids duplicating data in memory — the underlying Arrow table is shared and tensors are created lazily.

## Streaming Parquet from S3

When data lives in cloud storage and downloading the full dataset is impractical, use fsspec with PyArrow for cloud-native access.

```python
import fsspec
import pyarrow.parquet as pq

fs = fsspec.filesystem("s3", anon=False)
ds = pq.ParquetDataset("s3://bucket/data/", filesystem=fs)
table = ds.read(columns=["text", "label"])  # column pushdown — only reads requested columns
df = table.to_pandas()
```

Column pushdown is critical for wide tables. If the table has 200 columns but training only needs 3, column pushdown reads 1.5% of the data from storage. This reduces both network transfer and memory usage dramatically.

For row-level filtering, use `filters` parameter:

```python
table = pq.read_table(
    "s3://bucket/data/",
    filesystem=fs,
    columns=["text", "label"],
    filters=[("split", "=", "train")],
)
```

## Memory-mapped arrays

For large precomputed numpy arrays (embeddings, feature matrices), memory mapping avoids loading the entire array into RAM.

```python
import numpy as np

# Save once
np.save("features.npy", large_array)

# Load with memory mapping — reads from disk on demand
arr = np.load("features.npy", mmap_mode="r")

# Indexing reads only the requested rows from disk
batch = arr[1000:1032]  # reads 32 rows, not the entire file
```

Memory-mapped arrays are ideal for datasets that are too large for RAM but where random access is needed (e.g., a PyTorch Dataset that indexes into a precomputed embedding matrix). The operating system's page cache handles caching frequently accessed regions automatically.

## Choosing the right loader

**PyTorch DataLoader** for any PyTorch training loop. It gives full control over batching, shuffling, and parallelism. Use it when training with custom models or when the data format does not fit HuggingFace Datasets.

**HuggingFace Datasets** for NLP and multimodal tasks. It provides built-in tokenizer integration, streaming for massive datasets, and caching that eliminates redundant preprocessing. Use it when working with Transformer models and the HuggingFace ecosystem.

**Streaming (HuggingFace or fsspec)** when the dataset does not fit in RAM or on local disk. Streaming trades random access for constant memory usage — the entire dataset is never materialized.

**scikit-learn utilities** for small tabular datasets used with sklearn models. The API is simple and well-documented. Do not use sklearn loaders for datasets that need GPU training or distributed processing.

**Memory-mapped arrays** for large precomputed feature matrices that need random access without loading into RAM. Combine with PyTorch DataLoader for training.
