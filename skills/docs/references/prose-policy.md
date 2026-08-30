# prose-policy — what an LLM may write in a generated doc

Generated docs are contract-forward. The artifacts (tables, mermaid diagrams, runnable code samples) are the content; prose is what a human writes against them. The LLM's text budget is closed below — anything not listed is a `PROSE` finding in review.

## Allowed LLM text

1. **HTML comments.** `<!-- @agent: ... -->` guidance consumed during generation, and `<!-- @human: ... -->` fill-in prompts that stay in the doc until a human replaces them with prose.
2. **`## Requirements`.** Constrained requirement bullets per `references/requirements-guidance.md` (domain outcomes, never implementation restatements).
3. **`## References`.** Real verified technical/external sources.
4. **Artifact internals.** Table cells, mermaid node/edge labels, and code-sample comments — minimal and barebones: identifiers, types, one-phrase labels. Never narrative sentences inside artifacts.

## Everything else

Sections not listed above carry a `<!-- @human: ... -->` marker and nothing more until a person writes them. The generator never writes prose there, never deletes the marker, and never flags the section as incomplete.

## Marker semantics

| Marker | Generator behavior |
| --- | --- |
| `<!-- @agent: ... -->` | Replace with artifacts only (tables/diagrams/code/constrained requirements/references). If the section's content would be prose, emit nothing and leave the marker. |
| `<!-- @human: ... -->` | Preserve verbatim. Never fill, never delete. It is the hand-off to the human author. |

Docs written before this policy keep working: human prose already in place is preserved (`update`'s preserve-human-text rule), and review flags only new LLM prose that violates the policy, never text a human wrote.
