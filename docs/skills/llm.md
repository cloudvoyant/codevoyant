---
title: llm
---

# llm · experimental

> This skill is experimental. Recipes cover the LLM engineering stack but assume familiarity with Python packaging, TypeScript, and basic LLM concepts.

Context skill for LLM engineering: agent frameworks, document/image processing for LLMs, open-weight model serving, retrieval-augmented generation, and evaluation tooling.

## Requirements

- Python 3.11+
- Node.js 20+ and pnpm — for TypeScript agent recipes
- `uv` — Python package and project manager
- Cloud provider CLI (AWS CLI or gcloud) — for serving and cloud RAG recipes

## Philosophy

LLM engineering is systems engineering with a probabilistic core. The model is just one component in a pipeline that includes document ingestion, embedding, retrieval, prompt construction, tool execution, and output evaluation. These recipes treat each component as an independently testable, observable subsystem.

## Recipes

- [Agents with Vercel AI SDK / Anthropic SDK](./llm/recipes/agents-ai-sdk) — agent loop, tool calling, streaming, multi-turn, human-in-the-loop
- [Agents with LangChain/LangGraph](./llm/recipes/agents-langgraph) — chains, state graphs, conditional edges, memory, checkpointing
- [Tool Calling](./llm/recipes/tool-calling) — defining schemas, parallel tool use, error recovery, tool result handling
- [PDF and Document Ingestion](./llm/recipes/document-processing) — text extraction, OCR, chunking strategies (recursive, semantic)
- [Image Processing for Multimodal LLMs](./llm/recipes/image-tiling) — PDF rasterization, tiling large images for Vision APIs, canvas/WebGL rendering
- [Serving on AWS](./llm/recipes/serving-aws) — EC2 with vLLM, SageMaker endpoints, spot instances, quantization
- [Serving on GCP](./llm/recipes/serving-gcp) — Vertex AI Model Garden, Cloud Run with vLLM, Compute Engine GPU
- [RAG on AWS](./llm/recipes/rag-aws) — OpenSearch vector store, Bedrock embeddings, S3 + Lambda pipeline
- [RAG on GCP](./llm/recipes/rag-gcp) — Vertex AI Search, BigQuery vector search, RAG Engine
- [RAG with OSS](./llm/recipes/rag-oss) — Qdrant, Chroma, hybrid search (BM25 + vector), RAGAS evaluation
- [LLM Eval Tooling](./llm/recipes/llm-eval) — RAGAS, LangSmith tracing, custom eval harnesses, regression tracking

## References

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic SDK](https://docs.anthropic.com/en/docs/sdks)
- [LangChain](https://python.langchain.com/docs/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [vLLM](https://docs.vllm.ai/)
- [Qdrant](https://qdrant.tech/documentation/)
- [Chroma](https://docs.trychroma.com/)
- [RAGAS](https://docs.ragas.io/)
- [LangSmith](https://docs.smith.langchain.com/)
