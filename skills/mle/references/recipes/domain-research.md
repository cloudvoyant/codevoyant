# Researching a New Problem Domain

## Why structured research saves months

Jumping straight to model training without literature review and baseline establishment is the most common source of wasted GPU cycles. Many problems have been solved. Many datasets already exist. Many baselines already have published numbers.

Structured research prevents reinventing the wheel and sets a defensible success criterion before any code is written. A team that spends two weeks surveying the landscape often ships faster than a team that starts coding on day one, because they avoid dead-end architectures, discover existing datasets, and anchor their evaluation on metrics that actually matter.

## Literature review workflow

**Arxiv search strategy.** Use `arxiv.org/search` with specific terms, not broad ones. Filter by date to surface recent work. Use `cs.LG` (Machine Learning) and `stat.ML` (Statistics: Machine Learning) subject classifications to narrow results. Cross-reference with `cs.CV`, `cs.CL`, or `cs.AI` depending on the domain.

**Citation graph exploration.** `semanticscholar.org` lets you trace the citation graph in both directions: who cited this paper, and what does this paper cite. Start with the most-cited paper in your area, then walk forward through recent citations to find the current state of the art.

**Papers With Code.** `paperswithcode.com` links SOTA baselines to their code implementations. Always prefer a paper that has a reproducible implementation over one that does not. Check the "Results" tab for benchmark leaderboards to understand where the field stands.

**Calibrating baselines.** Note the dataset, metric, and model size alongside every baseline. A SOTA result on a 10B-parameter model is not a useful baseline for a project that needs inference in under 50ms. Filter for results that match your deployment constraints.

## Dataset discovery

**HuggingFace Datasets.** `datasets.load_dataset("dataset_name")` provides thousands of ready-to-use datasets with standardized train/val/test splits. Browse the hub at `huggingface.co/datasets` and filter by task type, language, and size.

**Kaggle.** `kaggle datasets list -s <keyword>` searches from the CLI. `kaggle datasets download -d <owner/dataset>` pulls it locally. Kaggle datasets often come with starter notebooks that reveal data quality issues and preprocessing steps.

**Academic sources.** UCI ML Repository, OpenML, and government open data portals (data.gov, data.europa.eu) host well-documented datasets with clear provenance. These are useful when you need a dataset with known properties for benchmarking.

**License checking.** Always inspect the license before using a dataset in a commercial product. CC-BY is safe. CC-NC (NonCommercial) is not. HuggingFace dataset cards document the license under metadata. When in doubt, trace the license back to the original source.

## Framing as an ML problem

**Classification vs regression vs generation.** Be explicit about what the model outputs and how that output will be used downstream. A classification framing produces discrete labels; a regression framing produces continuous values; a generation framing produces sequences. The choice constrains the loss function, the evaluation metrics, and the serving infrastructure.

**What makes a good proxy metric.** The metric must be measurable on held-out data, must correlate with the real-world outcome you care about, and must be achievable with the available label quality. F1-score on a noisy-labeled dataset can be misleading; consider inter-annotator agreement as a ceiling.

**Establishing a non-ML baseline first.** Can a set of rules, a lookup table, or a simple threshold solve 80% of the problem? If yes, that is the true baseline, not LogisticRegression. Non-ML baselines expose data quality issues, clarify the problem framing, and set a floor that any ML approach must clear to justify its complexity.

## Baseline implementation

Start with the simplest model that can learn from the features:

```python
from sklearn.linear_model import LogisticRegression

# Classification baseline
clf = LogisticRegression(max_iter=1000, solver="lbfgs")
clf.fit(X_train, y_train)
print(f"Accuracy: {clf.score(X_test, y_test):.4f}")
```

For regression problems, use `LinearRegression` or `Ridge`:

```python
from sklearn.linear_model import Ridge

reg = Ridge(alpha=1.0)
reg.fit(X_train, y_train)
print(f"R2: {reg.score(X_test, y_test):.4f}")
```

Why beating a simple baseline matters more than beating SOTA: if your neural network cannot outperform LogisticRegression on your specific dataset, the problem is the data or the framing, not the model architecture. Fix the data first.

## Problem scoping

**Data volume estimates.** How many labeled examples exist today? How many will exist at training time? What is the cost to acquire more? A model that needs 100k labeled examples is not viable if you have 500 and labeling costs $2 per example.

**Labeling cost.** Human annotation at scale (Scale AI, Labelbox, Amazon Mechanical Turk) has a per-label price that varies by task complexity. Weak supervision (Snorkel, programmatic labeling functions) can reduce this cost by an order of magnitude at the expense of label quality.

**Inference latency requirements.** Batch inference (hours acceptable) vs online inference (<200ms) vs real-time (<10ms) all drive different architecture choices. A transformer with 340M parameters can work for batch but not for real-time without quantization or distillation.

## Research note format

Write this down before writing any model code:

1. **Problem statement** in one sentence. What are you predicting, for whom, and why?
2. **Dataset stats.** Rows, features, label distribution, train/val/test split sizes.
3. **Baseline results.** Algorithm, hyperparameters, metric value.
4. **Chosen approach and why.** What architecture, what training framework, why this is better than the baseline.
5. **Known risks.** Data quality issues, label noise, distribution shift concerns, regulatory constraints.

This note becomes the first artifact in the experiment log. Every subsequent decision references back to it. If the problem statement changes, the note gets a new version, not an edit.
