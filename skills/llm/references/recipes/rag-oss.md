# RAG with OSS

## Why OSS for RAG

Open-source vector stores (Qdrant, Chroma) run locally or self-hosted with no cloud dependency, no per-query pricing, and full control over the index configuration. Combined with open embedding models (via sentence-transformers or Ollama), you can build a complete RAG pipeline that runs on a single machine for development and scales to a cluster for production.

The key advantages over managed cloud RAG services: no vendor lock-in, no per-query costs (you pay only for compute), ability to run entirely offline for air-gapped environments, and complete control over every component in the pipeline. The tradeoff is operational overhead -- you manage the vector database, embedding model serving, and the glue code between components.

LangChain provides a unified interface across vector stores, making it easy to swap backends without rewriting retrieval logic. This is particularly useful during prototyping: start with Chroma in-memory, then move to Qdrant for production.

## Qdrant

Qdrant is a high-performance vector search engine with rich filtering capabilities. It is the recommended choice for production OSS RAG deployments.

### Local setup

Run via Docker for development:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

Or use in-memory mode for tests and prototyping:

```python
from qdrant_client import QdrantClient

client = QdrantClient(":memory:")  # In-memory, no persistence
# or
client = QdrantClient(path="./qdrant_data")  # On-disk persistence
# or
client = QdrantClient(url="http://localhost:6333")  # Docker/remote
```

### Creating a collection

```python
from qdrant_client.models import VectorParams, Distance

client.create_collection(
    collection_name="docs",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)
```

### Indexing documents

```python
from qdrant_client.models import PointStruct

points = [
    PointStruct(
        id=i,
        vector=embedding,
        payload={"text": chunk, "source": "doc.pdf", "page": 3}
    )
    for i, (embedding, chunk) in enumerate(zip(embeddings, chunks))
]

client.upsert(collection_name="docs", points=points)
```

### Search

```python
results = client.search(
    collection_name="docs",
    query_vector=query_embedding,
    limit=10,
)

for result in results:
    print(f"Score: {result.score}")
    print(f"Text: {result.payload['text']}")
    print(f"Source: {result.payload['source']}")
```

### Filtered search

Qdrant supports rich filtering that is applied BEFORE vector search, not after. This means filters do not reduce result quality -- you always get the top-K results within the filtered subset:

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue

results = client.search(
    collection_name="docs",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="source",
                match=MatchValue(value="doc.pdf"),
            )
        ]
    ),
    limit=10,
)
```

### Why Qdrant for production

- Better performance at scale (millions of vectors) with HNSW indexing and quantization
- Rich filtering with payload indexes (numeric ranges, keyword matches, geo filters)
- Production-grade persistence with WAL (write-ahead log) and snapshots
- Horizontal scaling with sharding and replication
- gRPC API for high-throughput applications

## Chroma

Chroma is a simple, developer-friendly vector store optimized for rapid prototyping and small-to-medium datasets.

### Local setup

```python
import chromadb

# In-memory (no persistence)
client = chromadb.Client()

# On-disk persistence
client = chromadb.PersistentClient(path="./chroma_db")
```

### Creating a collection

```python
collection = client.create_collection(
    name="docs",
    metadata={"hnsw:space": "cosine"},
)
```

### Indexing

```python
collection.add(
    ids=["id1", "id2", "id3"],
    embeddings=[emb1, emb2, emb3],
    documents=["text 1", "text 2", "text 3"],
    metadatas=[
        {"source": "a.pdf"},
        {"source": "b.pdf"},
        {"source": "a.pdf"},
    ],
)
```

### Querying

```python
results = collection.query(
    query_embeddings=[query_emb],
    n_results=10,
)

# results["documents"][0] contains the matched texts
# results["distances"][0] contains the similarity scores
# results["metadatas"][0] contains the metadata dicts
```

### Auto-embedding

Chroma can auto-embed documents if you configure a default embedding function. This simplifies the pipeline by removing the explicit embedding step:

```python
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

collection = client.create_collection(
    name="docs",
    embedding_function=embedding_fn,
)

# Now you can add documents without pre-computing embeddings
collection.add(
    ids=["id1", "id2"],
    documents=["text 1", "text 2"],
)

# And query with text directly
results = collection.query(query_texts=["your question"], n_results=10)
```

### When to use Chroma

- Prototyping and development: the simplest API of any vector store
- Small datasets (under 100K vectors): performance is adequate
- Single-machine deployments with no clustering requirement
- When auto-embedding convenience outweighs scalability concerns

Do not use Chroma for production deployments with millions of vectors or high-concurrency requirements. Move to Qdrant or a managed vector store at that point.

## LangChain integration

LangChain provides a unified interface across vector stores. The key benefit: you can swap backends by changing one line of initialization code while the retriever and chain logic stays the same.

### Qdrant via LangChain

```python
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(model_name="all-mpnet-base-v2")

vectorstore = QdrantVectorStore.from_documents(
    docs,
    embedding_model,
    url="http://localhost:6333",
    collection_name="docs",
)
```

### Chroma via LangChain

```python
from langchain_chroma import Chroma

vectorstore = Chroma.from_documents(
    docs,
    embedding_model,
    persist_directory="./chroma_db",
)
```

### Retriever and RAG chain

Once you have a vectorstore, the retrieval and chain code is identical regardless of backend:

```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Classic chain pattern
from langchain.chains import RetrievalQA
qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)
result = qa.invoke({"query": "your question"})
```

Or the newer LCEL (LangChain Expression Language) pattern:

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "Answer based on this context:\n{context}\n\nQuestion: {question}"
)

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

answer = chain.invoke("your question")
```

### Swapping backends

To migrate from Chroma to Qdrant, change only the vectorstore initialization. The retriever and chain code remains untouched. This is the primary value of the LangChain abstraction for RAG pipelines.

## Hybrid search (BM25 + vector)

Vector search alone misses exact keyword matches (e.g., product names, error codes, acronyms). BM25 alone misses semantic similarity (e.g., "automobile" vs "car"). Combining both gives the best retrieval quality across all query types.

### LangChain EnsembleRetriever

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

# BM25 retriever from documents
bm25 = BM25Retriever.from_documents(docs)
bm25.k = 10

# Vector retriever from your vectorstore
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Ensemble with weighted combination
ensemble = EnsembleRetriever(
    retrievers=[bm25, vector_retriever],
    weights=[0.3, 0.7],
)

results = ensemble.invoke("your query")
```

### Weight tuning

Start with 0.3 BM25 / 0.7 vector as a baseline. Adjust based on your domain:

- **Technical domains** (legal, medical, code): increase BM25 weight to 0.4-0.5. These domains have specific terminology where exact matches matter.
- **Conversational queries** (customer support, general Q&A): keep BM25 at 0.2-0.3. Users phrase queries in natural language that benefits from semantic matching.
- **Mixed workloads**: stick with 0.3/0.7 and tune based on evaluation metrics (see the RAGAS section below).

### Qdrant native hybrid search

Qdrant supports sparse vectors for BM25-style retrieval alongside dense vectors. Upload both sparse and dense vectors and query with `prefetch` for multi-stage search:

```python
from qdrant_client.models import SparseVectorParams, SparseVector

# Create collection with both dense and sparse vectors
client.create_collection(
    collection_name="docs",
    vectors_config={"dense": VectorParams(size=768, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams()},
)

# Upsert with both vector types
client.upsert(
    collection_name="docs",
    points=[
        PointStruct(
            id=1,
            vector={
                "dense": dense_embedding,
                "sparse": SparseVector(indices=[1, 5, 100], values=[0.5, 0.3, 0.8]),
            },
            payload={"text": "chunk text"},
        )
    ],
)
```

This approach is more performant than the LangChain EnsembleRetriever because both search modes run inside Qdrant in a single request rather than two separate retrievers.

## Embedding models

Choosing and hosting the right embedding model is critical. The embedding model determines the quality ceiling of your entire RAG pipeline -- no amount of reranking or prompt engineering can fix bad embeddings.

### sentence-transformers

The most popular library for local embedding:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(texts, show_progress_bar=True)
```

### Model selection

| Model | Dimensions | Speed | Quality | Use Case |
|---|---|---|---|---|
| `all-MiniLM-L6-v2` | 384 | Fast | Good baseline | Prototyping, low-latency |
| `all-mpnet-base-v2` | 768 | Medium | Better | General production |
| `BAAI/bge-large-en-v1.5` | 1024 | Slower | Near-SOTA | Quality-critical production |

### Ollama for local embedding

If you already use Ollama for local LLM inference, you can also use it for embeddings:

```bash
ollama pull nomic-embed-text
```

```python
import requests

response = requests.post(
    "http://localhost:11434/api/embeddings",
    json={"model": "nomic-embed-text", "prompt": "your text here"},
)

embedding = response.json()["embedding"]
```

### Dimension vs quality tradeoff

Larger dimensions mean better retrieval quality but more storage and slower search. For most use cases, 768 dimensions is the sweet spot. Going from 384 to 768 gives a meaningful quality improvement. Going from 768 to 1024 gives a smaller improvement that may not justify the extra storage and latency cost.

## Evaluation with RAGAS

RAGAS (Retrieval-Augmented Generation Assessment) measures RAG pipeline quality with four core metrics. Use it to objectively compare different configurations (chunking strategies, embedding models, retrieval parameters).

### Core metrics

- **faithfulness** -- Is the answer grounded in the retrieved context? Low faithfulness means the model is hallucinating beyond what the context provides.
- **answer_relevancy** -- Does the answer address the question? Low relevancy means the answer is off-topic or tangential.
- **context_precision** -- Are the retrieved chunks relevant? Low precision means retrieval returns too much irrelevant content that dilutes the context.
- **context_recall** -- Did retrieval find all relevant information? Low recall means relevant documents exist in the index but were not retrieved.

### Setup and evaluation

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Prepare evaluation dataset
eval_dataset = Dataset.from_dict({
    "question": ["What is the capital of France?", "How does photosynthesis work?"],
    "answer": ["Paris is the capital of France.", "Plants convert sunlight to energy."],
    "contexts": [
        ["France is a country in Europe. Its capital is Paris."],
        ["Photosynthesis converts light energy into chemical energy in plants."],
    ],
    "ground_truth": [
        "The capital of France is Paris.",
        "Photosynthesis is the process by which plants convert light energy into chemical energy.",
    ],
})

result = evaluate(
    eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(result)
# Returns a dict with scores for each metric (0.0 to 1.0)
```

### Interpreting results

- **faithfulness < 0.8** -- The model hallucinates beyond the retrieved context. Fix: use a more instruction-following model, add explicit "only use the provided context" instructions, or reduce max_tokens.
- **context_precision < 0.7** -- Retrieval returns too much irrelevant content. Fix: reduce chunk size, add reranking, or increase the embedding model quality.
- **context_recall < 0.7** -- Retrieval misses relevant documents. Fix: increase top-K, try hybrid search (BM25 + vector), or improve chunking to avoid splitting relevant information across chunks.
- **answer_relevancy < 0.8** -- The answer does not address the question. Fix: improve the prompt template, ensure the retrieved context is relevant (check context_precision first).

### Iterative improvement

Run RAGAS after each pipeline change to measure impact. Typical iteration cycle:

1. Establish baseline scores with default settings
2. Change one variable (chunk size, embedding model, top-K, reranker)
3. Re-run RAGAS and compare
4. Keep changes that improve scores, revert those that do not

Cross-reference with the `llm-eval.md` recipe for broader LLM evaluation patterns beyond RAG-specific metrics.

## Gotchas

**Embedding model mismatch.** The same embedding model must be used for indexing and querying. If you re-embed with a different model, you must re-index the entire collection. There is no way to mix embeddings from different models in the same index -- the vector spaces are incompatible.

**Chroma auto-embedding default.** Chroma's auto-embedding uses `all-MiniLM-L6-v2` by default. If you switch to a different embedding model later, existing embeddings in the collection are incompatible. You must delete the collection and re-index everything.

**Qdrant upsert with duplicate IDs.** `upsert` with duplicate IDs overwrites the existing point. If you re-index a document, use deterministic IDs based on content hash (e.g., `hashlib.sha256(chunk.encode()).hexdigest()[:16]`) to avoid duplicates while ensuring updated content replaces stale entries.

**LangChain `from_documents` re-creates collections.** By default, `from_documents` creates a new collection and drops existing data. Use `from_existing_collection` or the vectorstore's `add_documents` method to add to an existing index without losing data.

**BM25Retriever memory usage.** LangChain's `BM25Retriever` loads all documents into memory for the BM25 index. For large document sets (more than 100K documents), this can consume several GB of RAM. Consider using an external BM25 engine (Elasticsearch, OpenSearch) for large-scale hybrid search.

**RAGAS requires ground-truth data.** The `context_recall` and `faithfulness` metrics need ground-truth answers. Creating a high-quality evaluation dataset is the most time-consuming part of RAG evaluation. Start with 50-100 manually curated question-answer pairs covering your most important query types.
