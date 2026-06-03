# Data Curation

## Why curation matters

The model can only learn patterns that exist in the training data. Noisy labels, duplicate samples, and inconsistent formatting degrade model quality regardless of architecture or hyperparameter tuning. Data curation is the process of transforming raw collected data into a clean, deduplicated, quality-filtered dataset that is ready for training.

There are three curation stages: format normalization (consistent schema and encoding), quality filtering (remove noise and low-value samples), and deduplication (remove redundancy that biases the model toward overrepresented patterns).

## Deduplication strategies

### Exact deduplication

Hash each row or document with SHA-256 and discard duplicates. This is the cheapest dedup method and should always be the first pass.

```python
import hashlib

def row_hash(row: dict) -> str:
    return hashlib.sha256(str(row).encode()).hexdigest()

seen = set()
deduped = []
for row in dataset:
    h = row_hash(row)
    if h not in seen:
        seen.add(h)
        deduped.append(row)
```

For datasets too large to hold all hashes in memory, use a Bloom filter (`pybloom_live` or `bloom-filter2`) for approximate dedup with configurable false-positive rate. A 1% false-positive rate is acceptable for most training workloads — it removes nearly all duplicates while losing very few unique samples.

### Fuzzy deduplication

Near-duplicate text (e.g., web scrapes with minor formatting differences) requires fuzzy matching. MinHash with Locality-Sensitive Hashing (LSH) is the standard approach.

```python
from datasketch import MinHash, MinHashLSH

lsh = MinHashLSH(threshold=0.8, num_perm=128)

for idx, doc in enumerate(documents):
    mh = MinHash(num_perm=128)
    for token in doc.split():
        mh.update(token.encode("utf8"))
    lsh.insert(str(idx), mh)

# Query for near-duplicates of a new document
result = lsh.query(query_minhash)
```

The `threshold` parameter controls how similar two documents must be to be considered duplicates. 0.8 is a reasonable starting point for web text. Lower thresholds catch more near-duplicates but increase false positives.

SimHash is an alternative for very large corpora where MinHash's memory footprint becomes prohibitive. SimHash produces a fixed-size fingerprint per document and uses Hamming distance for comparison.

### Embedding deduplication

When semantic similarity matters more than surface-level overlap — for example, paraphrases that use completely different wording — encode samples with a sentence transformer and cluster in embedding space.

```python
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(documents)

clustering = DBSCAN(eps=0.3, min_samples=2, metric="cosine").fit(embeddings)

# Keep one representative per cluster
representatives = []
for label in set(clustering.labels_):
    if label == -1:  # noise points are unique — keep all
        representatives.extend(np.where(clustering.labels_ == -1)[0])
    else:
        cluster_indices = np.where(clustering.labels_ == label)[0]
        representatives.append(cluster_indices[0])  # keep first
```

Embedding dedup is the most expensive method but catches semantic duplicates that hash and MinHash miss entirely. Use it as a final pass after exact and fuzzy dedup have removed the easy cases.

### When to use which

Use exact hash dedup always — it is cheap and catches verbatim copies. Add fuzzy dedup (MinHash + LSH) when the data source is likely to contain near-duplicates (web scrapes, aggregated feeds, user-submitted content). Add embedding dedup when the task is sensitive to semantic redundancy (retrieval, question answering, generation) and the dataset is small enough that encoding every sample is feasible.

## Quality filtering

### Heuristic filters

Fast, interpretable, and easy to debug. Apply these first to remove obviously bad samples before more expensive filtering.

```python
import langdetect

def quality_filter(row: dict) -> bool:
    text = row["text"]
    # Too short to be useful
    if len(text) < 50:
        return False
    # Too many special characters (likely boilerplate or encoding errors)
    special_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / len(text)
    if special_ratio > 0.3:
        return False
    # Wrong language
    try:
        if langdetect.detect(text) != "en":
            return False
    except langdetect.LangDetectException:
        return False
    return True
```

**Perplexity filtering** uses a small language model to score samples. Low perplexity indicates coherent, well-formed text. High perplexity indicates noise, encoding errors, or machine-generated garbage. KenLM is fast enough to filter millions of documents.

### Classifier-based filtering

Train a binary classifier on a small set of manually labeled good/bad samples, then use it as a reusable filter for the full dataset.

```python
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(max_features=10000)
X = vectorizer.fit_transform(labeled_texts)
clf = LogisticRegression().fit(X, labels)

# Apply to full dataset
X_full = vectorizer.transform(all_texts)
predictions = clf.predict_proba(X_full)[:, 1]  # probability of "good"
filtered = [t for t, p in zip(all_texts, predictions) if p > 0.7]
```

This approach scales well and can be retrained as annotation standards evolve. Save the vectorizer and classifier as artifacts alongside the dataset for reproducibility.

### Schema and statistical validation

Use Great Expectations or Pandera to enforce schema constraints and catch data drift.

```python
import pandera as pa

schema = pa.DataFrameSchema({
    "text": pa.Column(str, pa.Check.str_length(min_value=50)),
    "label": pa.Column(int, pa.Check.isin([0, 1])),
    "score": pa.Column(float, pa.Check.in_range(0.0, 1.0)),
})

schema.validate(df)  # raises SchemaError on violations
```

Run validation after every curation step — not just at the end. This catches issues early and makes debugging easier.

## Distributed curation with Ray Data

For datasets that do not fit on a single machine, use Ray Data to parallelize the curation pipeline.

```python
import ray

ds = ray.data.read_parquet("s3://bucket/raw/")
ds = ds.filter(lambda row: len(row["text"]) > 50)
ds = ds.map(lambda row: {**row, "text": row["text"].strip()})
ds.write_parquet("s3://bucket/curated/")
```

Ray Data streams data through the pipeline without loading the full dataset into memory. Combine with `map_batches` for vectorized operations that benefit from batch processing (e.g., running a quality classifier on GPU).

## Fast dedup with Polars

For datasets that fit in memory, Polars is significantly faster than pandas for deduplication.

```python
import polars as pl

df = pl.read_parquet("data.parquet")
df = df.unique(subset=["text_hash"])  # exact dedup on pre-computed hash
df = df.filter(pl.col("text").str.len_chars() > 50)  # length filter
df.write_parquet("data_curated.parquet")
```

Polars uses all available cores automatically and processes data in chunks that fit in CPU cache. For datasets under 100GB on a machine with sufficient RAM, Polars is often faster than a distributed solution because it avoids serialization and scheduling overhead.

## Deciding what is "good enough"

The quality threshold depends on the task. Classification tasks are relatively tolerant of noise — a few mislabeled samples have minimal impact when the dataset is large. Generation tasks (text generation, image synthesis) are highly sensitive to noise because the model memorizes and reproduces low-quality patterns. Retrieval tasks need high precision in the index — duplicate or irrelevant documents directly degrade search quality.

Start with aggressive filtering and measure downstream task performance. If the model underfits (low training accuracy), relax filters to increase dataset size. If the model overfits or produces low-quality outputs, tighten filters. There is no universal threshold — calibrate empirically for each project.
