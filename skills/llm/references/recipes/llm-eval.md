---
title: LLM Eval Tooling
---

# LLM Eval Tooling

## Why eval is non-negotiable

Without eval, every change to your prompt, retrieval pipeline, or model is a gamble. Eval turns LLM development from "vibes-based" to "data-driven": you can measure whether a change improved answer quality, detect regressions before they reach users, and compare models objectively. Eval is not a one-time step; it runs continuously as part of CI/CD.

The cost of skipping eval is invisible at first -- outputs look "fine" in ad-hoc testing -- but compounds over time. A prompt tweak that improves one class of questions may silently degrade another. A model upgrade may trade latency for quality in ways you only discover from user complaints. Eval gives you the data to make these trade-offs intentionally.

## RAGAS for RAG pipelines

RAGAS provides metrics specifically designed for RAG evaluation. Setup and core usage are covered in the `rag-oss.md` recipe; this section focuses on advanced patterns.

### Building an eval dataset

Start with 50-100 question-answer pairs that cover your domain's edge cases. Include:

- Questions with single-document answers (straightforward retrieval)
- Questions requiring multi-document synthesis
- Questions that should return "I don't know" (no relevant context exists)
- Adversarial questions that test boundary conditions

Store the dataset as a versioned JSON or CSV file alongside your codebase:

```json
[
  {
    "question": "What is the maximum payload size for the ingest endpoint?",
    "ground_truth": "The maximum payload size is 10MB per request.",
    "context_source": "api-reference/ingest.md"
  },
  {
    "question": "How do I configure multi-region replication?",
    "ground_truth": "Multi-region replication is not currently supported.",
    "expected_behavior": "no_answer"
  }
]
```

### Automated dataset generation

RAGAS can generate synthetic test questions from your documents:

```python
from ragas.testset.generator import TestsetGenerator

generator = TestsetGenerator.from_langchain(llm, embeddings)
testset = generator.generate_with_langchain_docs(
    documents,
    test_size=50,
)
```

Review and curate the generated questions before using them as a test set. Automated generation is a starting point, not a finished dataset -- remove duplicates, fix incorrect ground truths, and add edge cases that the generator missed.

### Running in CI

Wrap RAGAS evaluation in a pytest test that asserts minimum metric thresholds:

```python
from ragas import evaluate
from ragas.metrics import faithfulness, context_precision, answer_relevancy

def test_rag_quality(rag_pipeline, eval_dataset):
    result = evaluate(
        dataset=eval_dataset,
        metrics=[faithfulness, context_precision, answer_relevancy],
    )
    assert result["faithfulness"] > 0.8, f"Faithfulness too low: {result['faithfulness']}"
    assert result["context_precision"] > 0.7, f"Context precision too low: {result['context_precision']}"
    assert result["answer_relevancy"] > 0.75, f"Answer relevancy too low: {result['answer_relevancy']}"
```

A failing eval blocks the PR. Set thresholds conservatively at first -- you can tighten them as the pipeline matures.

## LangSmith tracing and eval

### Tracing

LangSmith captures every LLM call, tool invocation, and chain step for debugging and analysis.

Setup:

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=<key>
```

Once set, all LangChain and LangGraph calls are automatically traced. No code changes required.

### Viewing traces

The LangSmith web UI shows:

- A timeline of each step in the chain
- Input and output for every LLM call
- Latency breakdown per step
- Token usage and estimated cost

Use traces to debug unexpected outputs: find the step where the chain diverged from expected behavior, inspect the input that caused it, and fix the prompt or retrieval logic.

### Eval with LangSmith

Create a dataset in LangSmith, define evaluators, run your chain against the dataset, and view results in the UI:

1. **Create a dataset** -- upload question-answer pairs or collect them from production traces
2. **Define evaluators** -- LLM-as-judge, heuristic, or exact match
3. **Run evaluation** -- execute your chain against every example in the dataset
4. **View results** -- compare scores across runs, identify failing examples

### LLM-as-judge

Use a strong model (Claude) to evaluate a weaker model's output. Define criteria:

- **Correctness** -- does the answer match the ground truth?
- **Helpfulness** -- does the answer address the user's intent?
- **Harmlessness** -- does the answer avoid generating harmful content?

LangSmith provides built-in evaluator templates for common criteria. Customize the rubric to match your domain's requirements.

### Custom evaluators

```python
from langsmith.evaluation import evaluate

def my_evaluator(run, example):
    expected_keyword = example.outputs["keyword"]
    answer = run.outputs["answer"]
    score = 1 if expected_keyword in answer else 0
    return {"key": "keyword_match", "score": score}

evaluate(
    my_chain,
    data="my-dataset",
    evaluators=[my_evaluator],
)
```

Combine multiple evaluators in a single run to get a multi-dimensional quality score.

### Annotation queues

Route traces to human reviewers for quality assurance. Human labels feed back into the eval dataset, creating a feedback loop:

1. Production traces are sampled and added to an annotation queue
2. Reviewers label each trace as correct, partially correct, or incorrect
3. Labeled examples are added to the eval dataset
4. The eval suite grows over time, covering more edge cases

## Custom eval harnesses (pytest-style)

For teams that do not use LangSmith or need fully local eval.

### Structure

```
tests/
  eval/
    conftest.py
    data/
      eval_questions.json
    results/
    test_rag_quality.py
    test_agent_behavior.py
```

### Fixtures

A pytest fixture that loads the eval dataset and initializes the pipeline:

```python
import json
import pytest

@pytest.fixture
def eval_dataset():
    with open("tests/eval/data/eval_questions.json") as f:
        return json.load(f)

@pytest.fixture
def rag_pipeline():
    # Initialize your RAG pipeline here
    from myapp.rag import create_pipeline
    return create_pipeline()
```

### Test patterns

**Exact match** -- for factual queries with deterministic answers:

```python
def test_factual_answer(rag_pipeline, eval_dataset):
    for example in eval_dataset:
        response = rag_pipeline.query(example["question"])
        assert response.answer == example["expected_answer"]
```

**Contains check** -- for open-ended queries:

```python
def test_contains_keyword(rag_pipeline, eval_dataset):
    for example in eval_dataset:
        response = rag_pipeline.query(example["question"])
        assert example["keyword"] in response.answer.lower()
```

**LLM-as-judge** -- call a strong model to grade the response on a 1-5 scale with a rubric, assert the score meets a minimum threshold:

```python
def test_llm_judge(rag_pipeline, eval_dataset, judge_model):
    for example in eval_dataset:
        response = rag_pipeline.query(example["question"])
        score = judge_model.grade(
            question=example["question"],
            answer=response.answer,
            ground_truth=example["ground_truth"],
            rubric="Score 1-5: correctness, completeness, conciseness",
        )
        assert score >= 3, f"Low score ({score}) for: {example['question']}"
```

**Retrieval quality** -- assert that the correct source document appears in the retrieved context:

```python
def test_retrieval_quality(rag_pipeline, eval_dataset):
    for example in eval_dataset:
        response = rag_pipeline.query(example["question"])
        sources = [doc.metadata["source"] for doc in response.context]
        assert example["context_source"] in sources
```

**Latency** -- for user-facing pipelines:

```python
def test_latency(rag_pipeline, eval_dataset):
    for example in eval_dataset:
        response = rag_pipeline.query(example["question"])
        assert response.latency_ms < 2000, f"Too slow: {response.latency_ms}ms"
```

### Running

```bash
pytest tests/eval/ -v --tb=short
```

Separate eval tests from unit tests: eval tests are slow (they call LLMs) and expensive. Run them in a dedicated CI stage, not on every commit.

### Result tracking

Write eval results to a JSON file with timestamp, commit hash, and metrics. Maintain a `tests/eval/results/` directory with historical results for trend analysis:

```python
import json
import subprocess
from datetime import datetime

def save_eval_results(metrics: dict, output_dir: str = "tests/eval/results"):
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"]
    ).decode().strip()
    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "commit": commit,
        "metrics": metrics,
    }
    path = f"{output_dir}/eval-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
    with open(path, "w") as f:
        json.dump(result, f, indent=2)
```

## Model comparison

Evaluating multiple models on the same test set to make informed selection decisions.

### Parameterized tests

```python
import pytest

@pytest.mark.parametrize("model", [
    "claude-sonnet-4-20250514",
    "gpt-4o",
    "llama-3.1-70b",
])
def test_model_quality(model, eval_dataset, create_pipeline):
    pipeline = create_pipeline(model=model)
    scores = []
    for example in eval_dataset:
        response = pipeline.query(example["question"])
        score = grade_response(response, example)
        scores.append(score)
    avg_score = sum(scores) / len(scores)
    assert avg_score >= 3.0, f"{model} average score too low: {avg_score}"
```

### Comparison table

Generate a markdown table from results for model selection decisions:

| Model | Avg Score | Latency p50 | Latency p95 | Cost/Query |
|---|---|---|---|---|
| claude-sonnet-4-20250514 | 4.2 | 1200ms | 2800ms | $0.012 |
| gpt-4o | 3.9 | 900ms | 2100ms | $0.015 |
| llama-3.1-70b | 3.5 | 600ms | 1400ms | $0.003 |

This table is the basis for model selection decisions. Quality, latency, and cost are the three axes; the right choice depends on your use case.

### A/B testing in production

Route a percentage of traffic to the new model, compare eval metrics over 24-48 hours, then promote or rollback. Requirements:

- Log inputs, outputs, and user feedback alongside model identifiers
- Compare eval metrics (quality score, latency, error rate) between model variants
- Set a minimum sample size before making a decision (at least 100 queries per variant)
- Automate the promotion/rollback decision with threshold checks

## Regression tracking

Detecting quality degradation over time.

### Baseline

After initial development, run the full eval suite and record results as the baseline:

```bash
pytest tests/eval/ -v --tb=short
# Save output to tests/eval/baselines/baseline-YYYY-MM-DD.json
```

Store baselines in `tests/eval/baselines/baseline-YYYY-MM-DD.json`.

### Regression detection

In CI, compare current results against the baseline. Flag any metric that drops by more than a configurable threshold (e.g., 5% relative decrease):

```python
def check_regression(current: dict, baseline: dict, threshold: float = 0.95):
    for metric, baseline_score in baseline["metrics"].items():
        current_score = current["metrics"][metric]
        assert current_score >= baseline_score * threshold, (
            f"Regression: {metric} dropped from {baseline_score:.3f} "
            f"to {current_score:.3f} ({(1 - current_score / baseline_score) * 100:.1f}% decrease)"
        )
```

### Common causes of regression

- **Prompt changes** -- a tweak that improves one category degrades another
- **Model updates** -- API providers sometimes update models silently
- **Retrieval pipeline changes** -- new chunking strategy, different embedding model
- **Data drift** -- new documents change the embedding distribution

When a regression is detected, the eval result points to which metric regressed, which helps narrow the cause.

### Dashboard

For teams with production LLM systems, export eval metrics to a monitoring system (Datadog, Grafana) and set up alerts on threshold violations. Track:

- Per-metric scores over time (faithfulness, relevancy, precision)
- Latency percentiles (p50, p95, p99)
- Error rates (timeouts, malformed outputs, refusals)
- Cost per query over time

## Gotchas

**LLM-as-judge is not deterministic.** Running the same evaluation twice can produce different scores. Mitigate by averaging over 3 runs or using `temperature=0`.

**RAGAS requires an LLM to compute metrics.** By default it uses OpenAI. Configure it to use your preferred model to avoid unexpected API calls and costs.

**Eval datasets drift.** As your domain evolves, the eval dataset must be updated. Schedule quarterly reviews to add new edge cases, remove obsolete questions, and update ground truths.

**Cost adds up.** A 100-question eval suite calling a model 3 times per question (for judge, generation, and comparison) costs approximately $1-5 per run. Budget for this in CI costs. Consider running the full suite only on PR merges, with a smaller smoke-test suite on every commit.

**Flaky evals erode trust.** If an eval test fails intermittently due to non-determinism rather than a real regression, teams learn to ignore failures. Keep thresholds realistic and use averaging to smooth out noise.
