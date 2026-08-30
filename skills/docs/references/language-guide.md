# Language Guide

Rules for writing engineering documentation. For sentence length, tense, voice, and vocabulary, follow the STE ruleset at `references/simple-english/ruleset.md` in pragmatic mode.

## Docs-Specific Rules

### 1. Define every acronym on first use

Define in parentheses after the first use. Not in a glossary at the bottom.

Bad: "The app uses OIDC via an M2M flow."
Good: "The app uses OpenID Connect (OIDC) via a machine-to-machine (M2M) flow."

### 2. One idea per sentence

Split compound sentences. Each sentence carries one fact or one instruction.

### 3. Use "you" (second person)

The reader is always "you". Not "the developer", "the user", "one", or passive voice.

### 4. Keep `## Overview` to 3 sentences

1. What is this?
2. Where does it live?
3. Why does it exist?

### 5. Tables for 3+ related properties

Use a table instead of prose for lists of 3 or more related properties, flags, or env vars.

### 6. Diagrams replace prose

If a numbered list describes a multi-step flow, replace it with a Mermaid diagram (see `references/mermaid-guide.md`). Keep the list only if the diagram is harder to read.

### 7. Link, do not duplicate

If another doc already explains it, link to that doc. Do not repeat the content.

### 8. Soft-wrap prose

Write each paragraph as one continuous line. Do not insert manual newlines to wrap at a fixed column width. Newlines separate paragraphs, list items, headings, and code fences only.

### 9. No impl-detail jargon in Overview and Requirements

No class names, function names, or file paths in `## Overview`. No TypeScript generics or internal abstractions in `## Requirements`. Save those for `## Design` and `## Implementation`.

### 10. Brevity is the point

Docs load into reader (and LLM) context. Verbosity is a defect. If a sentence does not change what the reader does, cut it.

### 11. References required

Every doc ends with a `## References` section (or carries inline links throughout) — never neither. References are real, verified sources, not placeholders.

## Preserve Human Text

When updating existing docs, preserve human-authored text. Change only text that is inaccurate or structurally incomplete. Do not rephrase working prose for style.

## Review Checks

`review.md` Step 3c runs these checks. They are the executable subset of the rules above plus the vendored STE ruleset (`references/simple-english/ruleset.md`). Each violation is a `LANGUAGE` finding with a minimal rewrite.

1. **Acronyms** (rule 1): a known acronym (JWT, OIDC, OAuth, SSR, CDN, GCP, IAM, K8s, CI/CD, …) with no parenthetical definition on first use in the file.
2. **Second person** (rule 3): "the developer", "the user", "one", or passive voice where "you" is the reader.
3. **Overview length** (rule 4): `## Overview` with more than 3 sentences.
4. **Sentence length** (STE 5.1 / 6.3): a sentence over 20 words in a procedural section, or over 25 in a descriptive section. Count quoted text/identifiers as one word (STE 8.6).
5. **Contractions** (STE self-check): `'ll`, `'re`, `'s` — write out.
6. **Semicolons** (STE 8.1): write two sentences instead.
7. **Banned modals** (STE 3): "should", "would", "may", "might", "could" outside code blocks/quoted text. Requirement "should" → "must"; possibility → "can"; hypothetical → restructure.
8. **Slop vocabulary** (STE slop table): leverage, utilize, ensure, in order to, functionality, enables you to, allows you to, is designed to, aims to, dive into, delve into, robust, powerful, comprehensive, seamlessly, facilitate, streamline, and/or, etc. → the plain replacement from the ruleset.
9. **Condition-first** (STE 5.4): a sentence where `if`/`when` stands after the command ("Increase the timeout if the network is slow" → "If the network is slow, increase the timeout").
10. **Procedural imperative** (STE 5.3): in a procedural section, an instruction written as a statement instead of an imperative.
11. **R1 no-impl-terms** (requirements-guidance): a `## Requirements` bullet naming an endpoint, route, class, function, table, SQL, UI widget, or file path as if it were the requirement.
12. **R2 survive-change** (requirements-guidance): a requirement whose wording would need to change if the implementation changed.
13. **R3 fit-criterion** (requirements-guidance): a Functional requirement with no observable outcome or measurable success condition.
14. **R4 smells** (requirements-guidance): subjective language, ambiguous adverbs/adjectives, superlatives, totality terms, baseline-less comparatives in a requirement.
15. **R5 invariant** (requirements-guidance): an implementation invariant stated as a Functional requirement.
16. **R6 source** (requirements-guidance): a domain claim with neither `Source:` nor `[ASSUMPTION — unvalidated]`.
17. **R7 verbs** (requirements-guidance): a requirement using should/would/can instead of the template's prescribed verbs.

For each violation, record `type: LANGUAGE` (checks 1–10) or `type: REQUIREMENTS` (checks 11–17, applied only inside `## Requirements` sections), `current_text` = the exact offending sentence, `replacement_text` = the minimal rewrite that fixes only that violation, `rationale` = the rule number/name. Never rephrase working prose for style.
