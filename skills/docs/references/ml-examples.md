# ML examples — boundaries and requirements

Worked examples for the ml-model, data-pipeline, and experiment templates. The rule that matters most: how a class operates is an implementation invariant, never a functional requirement.

## Module boundaries

A module owns one thing and depends on others through their public API only.

- **model** owns inference. It depends on the tokenizer and the weights artifact. It does NOT own training, feature stores, or serving infra.
- **pipeline** owns the stages from source to output artifact. It depends on the model (via the model's public API) and the feature store. It does NOT own the model's weights or the experiment that chose them.
- **experiment** owns the comparison. It depends on the model, the dataset, and the metric set. It does NOT own the model's implementation.

A boundary crossing (a pipeline reading a model's internal tensor cache) is a bug in the doc, the same as in code — reference the public API instead.

## Functional vs non-functional vs invariant

For a **classification model**:

- Functional (expected behavior): the model must return a probability vector over the fixed label set for every accepted input.
- Non-functional (constraint): inference must complete in under 40 ms p95 on the target hardware.
- Invariant (implementation, NOT behavior): the encoder caches token ids and must be thread-safe. This belongs in `## Implementation`, not `## Requirements`.

For a **web app**:

- Functional: a logged-in user can create and read a resource.
- Non-functional: the API responds in under 200 ms p95.
- Invariant: the repository layer returns a single connection per request. Implementation, not behavior.

The difference: functional requirements are what the consumer relies on; invariants are how the code keeps its own promises. Do not state an invariant as behavior.

## Example pipeline requirements

- Functional: produces a Parquet table `events` keyed by `event_id`, written at least once per hour.
- Non-functional: end-to-end lag under 5 minutes p95; at-least-once delivery with idempotent writes.
- Invariant: the extractor is single-flight per partition; concurrent runs must not double-emit.
