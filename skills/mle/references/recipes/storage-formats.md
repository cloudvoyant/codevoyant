# Storage Formats for ML

## Why format choice matters

Parquet reads 10x faster than CSV for columnar access because it stores data column-by-column, enabling predicate pushdown and column pruning. HDF5 supports random access into large arrays without reading the full file, making it efficient for accessing specific training batches. LMDB is a memory-mapped key-value store that delivers near-zero-copy reads — the fastest possible format for iterating over image datasets during training.

Choosing the wrong format can make data loading the training bottleneck even when GPU utilisation is low. Format choice is not an afterthought; it is an architectural decision that affects training speed, storage cost, and pipeline complexity.

## Parquet + PyArrow

**Reading with column pruning.** The `columns` argument triggers column pruning, reading only the specified columns from disk.

```python
import pyarrow.parquet as pq

table = pq.read_table("data.parquet", columns=["feature_a", "label"])
```

**Writing.** Snappy compression is the default and provides a good balance of speed and size.

```python
pq.write_table(table, "output.parquet", compression="snappy")
```

**Partitioning.** Creates a directory layout like `data/split=train/`, `data/split=val/` that Ray Data and DuckDB both understand natively.

```python
pq.write_to_dataset(table, "data/", partition_cols=["split"])
```

**Predicate pushdown for large datasets.** PyArrow evaluates the filter at the file level without reading filtered rows into memory.

```python
table = pq.read_table("data/", filters=[("label", "!=", -1)])
```

Parquet is the default choice for structured tabular training data. It compresses well, supports schema evolution, and every major data tool reads it.

## Arrow IPC / Feather

Arrow IPC format (`.arrow` or `.feather`) is designed for in-process zero-copy sharing.

```python
import pyarrow as pa

# Reading
with pa.ipc.open_file("data.arrow") as reader:
    table = reader.read_all()
```

Feather v2 (`pyarrow.feather.write_feather`) is the recommended on-disk format for intermediate pipeline outputs where you control both the writer and reader. It is faster to read than Parquet because there is no decompression step, but files are larger.

Best used for ephemeral pipeline artifacts — preprocessed features passed between pipeline stages, cached intermediate results. Not suitable for long-term storage or archival because it lacks the compression and ecosystem support of Parquet.

## HDF5 with h5py

Hierarchical storage suitable for groups of named arrays, model weights, or training batches.

```python
import h5py
import numpy as np

# Creating a dataset with chunked storage
with h5py.File("dataset.h5", "w") as f:
    f.create_dataset(
        "images",
        data=images_array,
        chunks=(32, 224, 224, 3),
        compression="lzf",
    )
```

The `chunks` parameter is critical. It sets the unit of I/O. Choose chunk shape to match your access pattern — batch-sized chunks for sequential training avoids reading excess data. If you read 32 images at a time, set the first chunk dimension to 32.

`compression="lzf"` is faster than `gzip` with similar compression ratios. Use `gzip` only when file size is more important than read speed.

Use cases: storing pre-computed embeddings, large image tensors, or model checkpoints that need partial random access. HDF5 is not ideal for append-heavy workloads or concurrent writes — it uses file-level locking.

## LMDB

A memory-mapped key-value store that provides near-zero-copy reads by mapping file pages directly into the process address space. The `lmdb` Python package wraps Lightning MDB.

**Write transaction pattern.** Always write in large batched transactions (1000+ entries per transaction) to avoid fsync overhead.

```python
import lmdb

env = lmdb.open("data.lmdb", map_size=int(1e10))

with env.begin(write=True) as txn:
    for i, sample in enumerate(samples):
        txn.put(str(i).encode(), serialize(sample))
```

**Reading.**

```python
with env.begin() as txn:
    value = txn.get(str(idx).encode())
    sample = deserialize(value)
```

LMDB is ideal for image datasets where each sample is a JPEG blob and the key is the sample index. It avoids the overhead of opening individual files from the filesystem, which becomes significant at scale (millions of small files). LMDB databases are single-writer, many-reader safe without locking.

Set `map_size` large enough to hold the full dataset. On Linux, the memory map is lazy and does not allocate physical memory until pages are accessed. On macOS, be more conservative with `map_size` to avoid address space issues.

## Dataset versioning

**DVC (Data Version Control).** `dvc add data/train.parquet` creates a `.dvc` pointer file that is committed to git. The actual data lives in a remote storage backend (S3, GCS, Azure Blob).

```bash
dvc add data/train.parquet
git add data/train.parquet.dvc .gitignore
git commit -m "Add training data v1"
dvc push
```

`dvc push` and `dvc pull` sync data between local and remote. DVC tracks data lineage alongside code, so `git checkout v1.0` followed by `dvc checkout` reproduces the exact dataset that was used for that release.

**Lightweight convention alternative.** When DVC infrastructure is not justified, use versioned directories with a manifest:

```
data/
  v1/
    train.parquet
    manifest.json
  v2/
    train.parquet
    manifest.json
```

The `manifest.json` records the schema and a hash of the full dataset:

```json
{
  "version": "v1",
  "rows": 120000,
  "features": ["feature_a", "feature_b", "label"],
  "created": "2026-06-01",
  "hash": "<sha256>"
}
```

This enables reproducibility checks without DVC infrastructure. The hash can be verified with `sha256sum` to confirm that the dataset has not been modified since the manifest was written.
