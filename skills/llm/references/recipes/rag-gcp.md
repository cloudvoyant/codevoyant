# RAG on GCP

## Why RAG on GCP

If your data is already on GCP (Cloud Storage, BigQuery, Firestore), GCP offers multiple managed RAG paths that reduce infrastructure overhead. The two primary options are Vertex AI Search (fully managed, near-zero-code RAG) and BigQuery vector search (ideal when your data already lives in BigQuery). For more customizable pipelines, the Vertex AI RAG Engine API gives you control over chunking, embedding, and retrieval while still handling infrastructure.

Embedding is handled by `text-embedding-005` (768 dimensions) or `text-multilingual-embedding-002` for non-English content. Generation uses Gemini models through the same Vertex AI platform, keeping the entire pipeline within a single project and billing account.

## Vertex AI Search

Vertex AI Search (part of Vertex AI Agent Builder) provides fully managed RAG with minimal code. It handles document parsing, chunking, embedding, indexing, and answer generation.

### Setup

1. Create a search app in the Vertex AI Agent Builder console
2. Create a data store and connect it to a Cloud Storage bucket containing your documents
3. Vertex AI automatically chunks, embeds, and indexes the documents

### Querying

```python
from google.cloud import discoveryengine

client = discoveryengine.SearchServiceClient()

request = discoveryengine.SearchRequest(
    serving_config="projects/PROJECT/locations/global/collections/default_collection/dataStores/DATASTORE/servingConfigs/default_search",
    query="your question here",
    page_size=10,
)

response = client.search(request)

for result in response.results:
    doc = result.document
    print(f"Title: {doc.derived_struct_data.get('title')}")
    print(f"Snippet: {doc.derived_struct_data.get('snippets', [{}])[0].get('snippet')}")
```

The response includes relevant document snippets and an optional AI-generated answer (called "Answer" or "Summary" depending on your configuration).

### Advantages

- Zero infrastructure to manage -- no vector store, no embedding pipeline, no index tuning
- Automatic document processing for PDF, HTML, Word, CSV, and plain text
- Built-in answer generation with source citations
- Handles document updates and re-indexing automatically

### Disadvantages

- Limited control over chunking strategy (fixed-size or layout-based options only)
- Limited control over embedding model (you use Google's internal model)
- Pricing is per-query, which can be expensive at high volume
- Cannot bring your own embedding model or reranker

## Embedding with Vertex AI

`text-embedding-005` is the latest general-purpose embedding model from Google. It performs well on retrieval benchmarks and supports batch embedding natively.

### Basic invocation

```python
from vertexai.language_models import TextEmbeddingModel

model = TextEmbeddingModel.from_pretrained("text-embedding-005")
embeddings = model.get_embeddings(["first text", "second text"])

for embedding in embeddings:
    vector = embedding.values  # list of 768 floats
    print(f"Dimension: {len(vector)}")
```

### Batch support

Native batch embedding handles up to 250 texts per request. For large ingestion jobs, batch your texts into groups of 250:

```python
import itertools

def batch_embed(texts: list[str], batch_size: int = 250) -> list[list[float]]:
    model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        results = model.get_embeddings(batch)
        all_embeddings.extend([r.values for r in results])
    return all_embeddings
```

### Dimensionality reduction

The default output is 768 dimensions. You can reduce dimensionality via the `output_dimensionality` parameter (256 or 512) for cheaper storage and faster search with some quality tradeoff:

```python
embeddings = model.get_embeddings(
    ["your text"],
    output_dimensionality=256
)
```

Use 256 dimensions for prototyping and cost-sensitive applications. Use 768 for production where retrieval quality matters most.

### Cost

Approximately $0.025 per 1M characters. This is competitive with AWS Bedrock embedding pricing and significantly cheaper than OpenAI embeddings.

## BigQuery vector search

If your data is already in BigQuery, you can add vector search without a separate vector store. This keeps your data in one place and lets you combine vector search with SQL analytics.

### Creating embeddings inline

```sql
SELECT
    id,
    text_content,
    ml.generate_embedding(
        MODEL `my_project.my_dataset.text_embedding_005`,
        text_content
    ).text_embedding AS embedding
FROM `my_project.my_dataset.documents`
```

Store the results in a BigQuery table with a `FLOAT64` array column for the embedding.

### Vector search query

```sql
SELECT
    base.id,
    base.text_content,
    distance
FROM
    VECTOR_SEARCH(
        TABLE `my_project.my_dataset.document_embeddings`,
        'embedding',
        (SELECT ml.generate_embedding(
            MODEL `my_project.my_dataset.text_embedding_005`,
            'your search query'
        ).text_embedding AS embedding),
        top_k => 10
    )
```

### Advantages

- No separate vector store to manage
- SQL-based retrieval integrates with existing BigQuery analytics
- Can combine vector search with traditional SQL filters in a single query
- Pay only for BigQuery compute slots, no dedicated vector search infrastructure

### Disadvantages

- Higher latency than dedicated vector stores: seconds vs milliseconds for large tables
- Not suitable for real-time user-facing RAG where sub-100ms retrieval is needed
- The `BQML.GENERATE_EMBEDDING` function has a per-row cost
- Best for batch analytics, internal tools, and low-QPS applications

## Vertex AI RAG Engine

The RAG Engine API provides a middle ground between fully managed Vertex AI Search and fully custom pipelines. You get more control over chunking, embedding, and retrieval parameters while Google manages the underlying infrastructure.

### Creating a corpus

```python
from vertexai.preview import rag

corpus = rag.create_corpus(display_name="my-corpus")
print(f"Corpus name: {corpus.name}")
```

### Importing files

```python
rag.import_files(
    corpus.name,
    paths=["gs://my-bucket/docs/"],
    chunk_size=512,
    chunk_overlap=100,
)
```

You control chunk size and overlap, which directly affects retrieval quality. Smaller chunks (256-512 tokens) are better for precise factual retrieval. Larger chunks (1024-2048 tokens) preserve more context but may dilute relevance.

### Retrieval

```python
response = rag.retrieval_query(
    rag_resources=[rag.RagResource(rag_corpus=corpus.name)],
    text="your query here",
    similarity_top_k=10,
)

for context in response.contexts.contexts:
    print(f"Score: {context.score}")
    print(f"Text: {context.text}")
    print(f"Source: {context.source_uri}")
```

### Generation with retrieval

Integrate RAG Engine with Gemini for end-to-end question answering:

```python
from vertexai.generative_models import GenerativeModel, Tool

rag_retrieval_tool = Tool.from_retrieval(
    retrieval=rag.Retrieval(
        source=rag.VertexRagStore(
            rag_resources=[rag.RagResource(rag_corpus=corpus.name)],
            similarity_top_k=5,
        ),
    )
)

model = GenerativeModel(
    model_name="gemini-1.5-pro",
    tools=[rag_retrieval_tool],
)

response = model.generate_content("your question here")
print(response.text)
```

### Tradeoffs vs Vertex AI Search

More control than Vertex AI Search: you choose chunk size, overlap, embedding model, and retrieval parameters. Less control than fully custom: you cannot bring your own vector store or plug in a custom reranker. Use RAG Engine when you need tunable chunking but do not want to manage a vector database.

## Cloud Storage ingestion pipeline

For fully custom pipelines beyond Vertex AI Search and RAG Engine, build your own ingestion with Cloud Functions or Cloud Run.

### Event-driven pattern

GCS object creation event triggers a Cloud Function that extracts text, chunks, embeds, and writes to a vector store:

```python
import functions_framework
from google.cloud import storage
from vertexai.language_models import TextEmbeddingModel
from langchain.text_splitter import RecursiveCharacterTextSplitter

@functions_framework.cloud_event
def process_document(cloud_event):
    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]

    # Download document
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    content = blob.download_as_bytes()

    # Extract text (using PyMuPDF for PDFs)
    import fitz
    doc = fitz.open(stream=content, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)

    # Chunk
    splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)
    chunks = splitter.split_text(text)

    # Embed via Vertex AI
    model = TextEmbeddingModel.from_pretrained("text-embedding-005")
    embeddings = model.get_embeddings(chunks)

    # Write to vector store (Vertex AI Vector Search, BigQuery, etc.)
    # ...
```

### Vertex AI Vector Search

Formerly called Matching Engine, Vertex AI Vector Search provides a managed ANN index with millisecond latency. It is the right choice for real-time, user-facing RAG on GCP:

```python
from google.cloud import aiplatform

# Create index
index = aiplatform.MatchingEngineIndex.create_tree_ah_index(
    display_name="document-index",
    dimensions=768,
    approximate_neighbors_count=10,
)

# Deploy to endpoint
index_endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
    display_name="document-endpoint",
    public_endpoint_enabled=True,
)
index_endpoint.deploy_index(index=index, deployed_index_id="deployed-docs")

# Query via gRPC
response = index_endpoint.find_neighbors(
    deployed_index_id="deployed-docs",
    queries=[query_embedding],
    num_neighbors=10,
)
```

### Cost-performance tradeoffs

| Option | Latency | Ops Overhead | Best For |
|---|---|---|---|
| Vertex AI Vector Search | <100ms | Low | Real-time user-facing RAG |
| BigQuery vector search | 1-5s | Minimal | Analytics, batch, internal tools |
| Vertex AI Search | <1s | None | Zero-ops, rapid prototyping |

## Gotchas

**Vertex AI Search indexing lag.** After uploading documents, indexing can take 30-60 minutes before they appear in search results. There is no way to force immediate indexing. Plan for this in your deployment workflow and set user expectations accordingly.

**BigQuery vector search per-row cost.** The `BQML.GENERATE_EMBEDDING` function charges per row processed, not just per query. If your table has millions of rows and you run the embedding function over all of them, the cost adds up. Pre-compute and store embeddings rather than generating them at query time.

**Vertex AI Vector Search deployment step.** Creating an index is separate from deploying it to an endpoint. This step is often missed in tutorials and takes 20-30 minutes to complete. Your index is not queryable until it is deployed. Always check that `deploy_index` has finished before attempting queries.

**`text-embedding-005` input limit.** The model has a 2048 token input limit. Longer texts are silently truncated without any warning or error. Always chunk your documents before embedding to ensure no chunk exceeds this limit. A chunk size of 512 tokens with 50-token overlap is a safe default.

**Region consistency.** The embedding model, vector store, and generation model must all be in the same GCP region. Cross-region calls are either unsupported or add significant latency. Pick a region with broad Vertex AI model availability (`us-central1` is the safest choice) and keep everything there.

**Vertex AI Search pricing model.** Pricing is based on queries and stored documents. At high query volumes (more than 100K queries/month), the per-query cost can exceed the cost of running your own vector search infrastructure. Estimate your query volume before committing to this path.
