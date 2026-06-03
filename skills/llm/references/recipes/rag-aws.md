# RAG on AWS

## Why RAG on AWS

If your data is already on AWS (S3 documents, RDS databases, DynamoDB), building RAG on AWS minimizes data movement and latency. You avoid cross-cloud egress charges and can leverage IAM for unified access control across the entire pipeline.

AWS Bedrock provides managed embedding models (Titan, Cohere) and LLMs without provisioning GPUs. OpenSearch Serverless provides a managed vector store with automatic scaling. The full pipeline looks like this: S3 documents flow through Lambda ingestion, get embedded via Bedrock, indexed into an OpenSearch vector index, and then Bedrock LLMs handle generation at query time.

The key advantage over self-managed infrastructure is operational simplicity. No GPU instances to manage, no embedding servers to scale, no vector database clusters to maintain. The tradeoff is cost at scale and less control over model selection.

## Embedding with Bedrock

AWS Bedrock provides hosted embedding models that require no infrastructure setup:

- `amazon.titan-embed-text-v2:0` -- 1024 dimensions, best for English text, lowest cost
- `cohere.embed-english-v3` -- 1024 dimensions, stronger retrieval quality, multilingual variant available

### Basic invocation

```python
import json
import boto3

client = boto3.client("bedrock-runtime", region_name="us-east-1")

response = client.invoke_model(
    modelId="amazon.titan-embed-text-v2:0",
    body=json.dumps({"inputText": "your text here"})
)

embedding = json.loads(response["body"].read())["embedding"]
# Returns a list of 1024 floats
```

### Batch embedding

Bedrock does not support batch embedding natively. Implement concurrent requests with `ThreadPoolExecutor` or `asyncio`:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def embed_text(text: str) -> list[float]:
    response = client.invoke_model(
        modelId="amazon.titan-embed-text-v2:0",
        body=json.dumps({"inputText": text})
    )
    return json.loads(response["body"].read())["embedding"]

chunks = ["chunk 1 text", "chunk 2 text", "chunk 3 text"]

with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(embed_text, chunk): i for i, chunk in enumerate(chunks)}
    embeddings = [None] * len(chunks)
    for future in as_completed(futures):
        idx = futures[future]
        embeddings[idx] = future.result()
```

### Cost and rate limits

Titan embeddings cost approximately $0.02 per 1M tokens. The default rate limit is 50 requests/second. For production ingestion of large document sets, request a quota increase through the AWS Service Quotas console. At 50 req/s with average 200-token chunks, you can embed roughly 600K chunks per hour.

## OpenSearch vector store

OpenSearch Serverless provides a managed vector search experience. It handles scaling, patching, and replication automatically.

### Creating a serverless collection

Create a serverless collection with type `VECTORSEARCH` via the AWS console, CLI, or CloudFormation. The collection needs an encryption policy and a network policy before you can create it programmatically:

```bash
aws opensearchserverless create-collection \
    --name documents \
    --type VECTORSEARCH
```

### Creating a vector index

```json
PUT /documents
{
    "settings": {
        "index.knn": true
    },
    "mappings": {
        "properties": {
            "embedding": {
                "type": "knn_vector",
                "dimension": 1024,
                "method": {
                    "name": "hnsw",
                    "engine": "faiss"
                }
            },
            "text": {
                "type": "text"
            },
            "metadata": {
                "type": "object"
            }
        }
    }
}
```

### Indexing documents

```json
POST /documents/_doc
{
    "embedding": [0.123, 0.456, ...],
    "text": "chunk text here",
    "metadata": {
        "source": "doc.pdf",
        "page": 3
    }
}
```

### Vector search

```json
POST /documents/_search
{
    "query": {
        "knn": {
            "embedding": {
                "vector": [0.123, 0.456, ...],
                "k": 10
            }
        }
    }
}
```

### Hybrid search

Combine kNN with BM25 text search using `bool` queries. This catches both semantic matches (via vector) and exact keyword matches (via BM25):

```json
POST /documents/_search
{
    "query": {
        "bool": {
            "should": [
                {
                    "knn": {
                        "embedding": {
                            "vector": [0.123, 0.456, ...],
                            "k": 10
                        }
                    }
                },
                {
                    "match": {
                        "text": "your search query"
                    }
                }
            ]
        }
    }
}
```

## S3 + Lambda ingestion pipeline

Event-driven ingestion: an S3 PUT event triggers a Lambda function which processes the document, chunks it, embeds chunks via Bedrock, and indexes them into OpenSearch.

### Lambda function pattern

```python
import json
import boto3
from langchain.text_splitter import RecursiveCharacterTextSplitter

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime")
# Use opensearch-py with requests_aws4auth for serverless auth

def handler(event, context):
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = event["Records"][0]["s3"]["object"]["key"]

    # Download document from S3
    obj = s3.get_object(Bucket=bucket, Key=key)
    content = obj["Body"].read()

    # Extract text (PyMuPDF for PDFs, package as Lambda layer)
    import fitz
    doc = fitz.open(stream=content, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)

    # Chunk
    splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)
    chunks = splitter.split_text(text)

    # Embed each chunk via Bedrock
    embeddings = []
    for chunk in chunks:
        response = bedrock.invoke_model(
            modelId="amazon.titan-embed-text-v2:0",
            body=json.dumps({"inputText": chunk})
        )
        embedding = json.loads(response["body"].read())["embedding"]
        embeddings.append(embedding)

    # Bulk index into OpenSearch
    # ... (use opensearch-py bulk helper)
```

### Lambda constraints

Lambda has hard limits that affect document processing:

- **15-minute timeout** -- large PDFs with hundreds of pages may not finish in time
- **10GB ephemeral storage** -- the `/tmp` directory; large documents with embedded images can exceed this
- **10GB memory max** -- PyMuPDF and numpy are memory-intensive; allocate at least 1GB

For large documents (more than 100 pages), use Step Functions to orchestrate chunked processing: one state machine execution that fans out page ranges to parallel Lambda invocations.

### Managed alternative: Bedrock Knowledge Bases

For fully managed ingestion with zero code, use Bedrock Knowledge Bases:

- Configure an S3 data source pointing to your document bucket
- Bedrock automatically chunks, embeds, and indexes into OpenSearch Serverless
- Supports PDF, HTML, Word, CSV, and plain text
- Less control over chunking strategy (fixed-size or semantic chunking options)
- Syncs on a schedule or on-demand

This is the fastest path to a working RAG system on AWS, but you trade away control over the chunking and embedding pipeline.

## Reranking

Initial vector retrieval returns the top-K candidates; reranking reorders them by relevance using a cross-encoder model that scores each (query, document) pair independently. This is more accurate than embedding similarity but too expensive to run over the full index.

### Pattern: retrieve then rerank

Retrieve top-20 from OpenSearch, rerank with Cohere to top-5, pass top-5 to the LLM. This two-stage approach gives you the speed of approximate nearest neighbor search with the accuracy of cross-encoder scoring.

### Cohere Rerank via Bedrock

AWS Bedrock supports Cohere Rerank (`cohere.rerank-v3-5:0`):

```python
response = bedrock.invoke_model(
    modelId="cohere.rerank-v3-5:0",
    body=json.dumps({
        "query": "your search query",
        "documents": [doc["text"] for doc in search_results],
        "top_n": 5
    })
)

reranked = json.loads(response["body"].read())["results"]
# Returns documents reordered by relevance score
```

### Self-hosted cross-encoder

If you want to avoid Cohere pricing, host a cross-encoder model on SageMaker:

- `cross-encoder/ms-marco-MiniLM-L-6-v2` is lightweight and fast
- Deploy to a `ml.g5.xlarge` instance for GPU-accelerated scoring
- Latency: approximately 50ms for 20 documents

Reranking improves answer quality significantly for ambiguous queries where the top-1 vector result is not always the best answer.

## Generation with Bedrock

After retrieval (and optional reranking), construct a prompt with the retrieved chunks and send to a Bedrock LLM.

### Basic RAG prompt pattern

```python
def generate_answer(query: str, chunks: list[dict]) -> str:
    context = "\n\n".join(
        f"[Source: {c['metadata']['source']}, Page {c['metadata']['page']}]\n{c['text']}"
        for c in chunks
    )

    prompt = f"""Answer the question based on the following context. 
If the context does not contain enough information, say so.
Cite the source and page number for each claim.

Context:
{context}

Question: {query}"""

    response = client.invoke_model(
        modelId="anthropic.claude-sonnet-4-20250514-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000
        })
    )

    return json.loads(response["body"].read())["content"][0]["text"]
```

### Source citations

Ask the model to reference which chunks it used. Include chunk metadata (source document, page number) in the prompt context so the model can cite them. Return the chunk metadata alongside the generated answer so the UI can render clickable source links.

### Streaming responses

For user-facing applications, use `invoke_model_with_response_stream` to stream tokens as they are generated. This reduces perceived latency from seconds to sub-second time-to-first-token:

```python
response = client.invoke_model_with_response_stream(
    modelId="anthropic.claude-sonnet-4-20250514-v1:0",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1000
    })
)

for event in response["body"]:
    chunk = json.loads(event["chunk"]["bytes"])
    if chunk["type"] == "content_block_delta":
        print(chunk["delta"]["text"], end="", flush=True)
```

## Gotchas

**OpenSearch Serverless pricing is steep at low traffic.** You pay for OCU (OpenSearch Compute Units) with a minimum of 2 OCUs for indexing and 2 for search, even at zero traffic. That is approximately $700/month minimum. For dev/test, use a provisioned OpenSearch domain instead (a `t3.small.search` instance starts at roughly $26/month).

**Bedrock model availability varies by region.** `us-east-1` and `us-west-2` have the broadest selection of models. Check the Bedrock console for your region before assuming a model is available. Claude and Titan are generally available in most US regions; Cohere and Llama models have more limited availability.

**Lambda cold starts with large dependencies.** PyMuPDF and numpy Lambda layers add 5-10 seconds of cold start time. For real-time RAG where the Lambda is in the query path (not just ingestion), use provisioned concurrency to keep instances warm. Alternatively, move the query path to an ECS Fargate service where cold starts are less painful.

**OpenSearch index refresh interval.** Newly indexed documents are not searchable for up to 1 second (the default refresh interval). For real-time indexing where documents must be immediately searchable, call `POST /documents/_refresh` explicitly after indexing. But do not call refresh after every single document in bulk ingestion -- it will destroy indexing performance.

**Bedrock Knowledge Bases sync lag.** After uploading documents to S3, a Knowledge Base sync must be triggered (manually or via schedule). The sync process can take minutes to hours depending on document volume. There is no real-time ingestion path through Knowledge Bases.

**IAM permissions are complex.** A working RAG pipeline needs IAM policies for S3 access, Bedrock model invocation, OpenSearch Serverless collection access (via data access policies, not standard IAM), and Lambda execution roles. Test each permission boundary independently before debugging the full pipeline.
