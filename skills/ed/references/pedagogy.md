# Pedagogy reference — how ed writes teaching material

Every lesson, quiz, and project ed produces must teach *well*, not merely correctly. This file is the operational rubric that `create-lesson`, `create-quiz`, `create-project`, and the `ed-lesson-author` agent read before writing a single line of MDX. It is not aspirational prose — each section ends in a checkable rule.

The approach here is grounded in learning science (Mayer's cognitive theory of multimedia learning, Sweller's cognitive load theory, Bloom's revised taxonomy, the testing/retrieval-practice literature) and is directly descended from Dan McCreary's **"intelligent textbook"** patterns — the combination of *scored quality gates*, *Bloom-tagged learning objectives*, *define-before-display concept scaffolding*, and *verified references* that make an AI-generated textbook trustworthy rather than merely plausible. We adopt that lineage wholesale and target diffbook MDX components for the interactive layer. Credit: Dan McCreary, "Intelligent Textbooks" / "Generative AI for Intelligent Textbooks" pattern catalog (dmccreary).

The single non-negotiable standard: **graduate-level rigor delivered with undergraduate-level clarity.** We never trade one for the other. Feynman clarity is the delivery mechanism; graduate depth is the payload.

---

## 1. Feynman technique — clarity as a delivery mechanism, not a ceiling

Richard Feynman's teaching principle: if you cannot explain a thing in plain language, you have not understood it. We apply this as a *presentation discipline*, not as a license to simplify the content. The content stays at graduate depth — full derivations, research-literature framing, edge cases. What changes is the *order and register* of exposition.

**The four rules:**

1. **Plain-English gloss before jargon.** Never let a technical term appear for the first time without a one-clause plain-language gloss immediately before or in apposition to it. "The model's *capacity* — informally, how many distinct functions it can represent — grows with…" The gloss precedes the term or sits in the same sentence; it never trails a paragraph later.

2. **Analogy before formalism.** Lead each concept with a concrete scenario or physical analogy, then give the formal definition. The attention mechanism is "a soft, differentiable lookup table" *before* it is \( \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V \). The analogy is scaffolding; state its limits so the learner does not over-generalize it (every analogy leaks — say where).

3. **Do NOT dumb down.** After the gloss and the analogy, deliver the full thing: the complete derivation, the assumptions, the failure modes, the connection to the primary literature. A graduate reader is insulted by hand-waving. If a result has a proof sketch worth 200 words, write the 200 words. If a hyperparameter has a known pathology (e.g. attention entropy collapse, dead ReLUs, exploding gradients in deep RNNs), name it and cite where it was characterized.

4. **Research-literature context is mandatory.** A graduate lesson situates each idea in its lineage: who introduced it, what it replaced, what open problem it addresses. "Layer normalization (Ba et al., 2016) was introduced to remove batch-normalization's dependence on batch statistics, which…" This is what separates a graduate text from a tutorial.

**The Feynman test (apply to every finished section):** could an attentive first-year graduate student in an adjacent field read this section top to bottom and both *follow every sentence* and *reach the research frontier of this sub-topic*? If they lose the thread → clarity failure. If they finish under-challenged → depth failure. Both are defects.

---

## 2. Define-before-display scaffolding — the load-bearing rule

This is the highest-leverage discipline in this file and the one most frequently violated by generative authors. It is drawn directly from the intelligent-textbook concept-scaffolding pattern and is grounded in **Sweller's cognitive load theory**: a learner who meets a symbol they cannot decode spends working memory on decoding instead of on the idea, and the idea is lost. Every diagram, code block, equation, and table is a *display*. A display must never be the first place a term or symbol appears.

**The rule, stated precisely:** every technical term, variable, symbol, axis label, node label, and function name must be defined in running prose **before** it appears in any diagram, code example, chart, equation array, or table on that page. Prose introduces; displays reinforce.

**Sub-rules:**

- **Prose introduces; tables and diagrams reinforce.** A table is a *consolidation* device — it re-encodes what the prose already taught into a scannable form. If a reader meets a column header or a row concept for the first time in the table, the table has been misused. The same holds for mermaid node labels and chart series names.

- **Code gets a plain-language bridge sentence that names its parameters first.** Immediately before any code block, write one sentence that names, in prose, the key variables and what they hold. "The loop below iterates over `batches`; for each we compute `logits` (the raw pre-softmax scores), apply `cross_entropy`, and accumulate into `running_loss`." The reader should be able to predict what the code does *before reading it*. Then the code confirms the prediction.

- **Signpost sentences before complex elements.** Never drop a dense equation, a large diagram, or a long code block cold. Precede it with a one-sentence signpost that says what the element shows and what to look for: "The diagram below traces one token through the three attention sub-steps — watch how the residual stream (the vertical spine) is never overwritten, only added to." This primes the reader's schema (a Mayer *signaling / cueing* principle) and cuts extraneous load.

- **Equations obey the same rule.** Every symbol in a displayed equation must have been named in prose. When you write \[ \mathcal{L}(\theta) = -\frac{1}{N}\sum_{i=1}^{N} \log p_\theta(y_i \mid x_i) \] the reader must already know that \( \theta \) are the parameters, \( N \) the number of examples, \( (x_i, y_i) \) the \( i \)-th input/label pair, and \( p_\theta \) the model's predicted probability. Define them in the sentence before the display, not after.

**The top-to-bottom vocabulary test (run on every finished lesson):** read the page strictly top to bottom. Maintain a set of "defined terms." Every time a term/symbol/label appears in a display, check it is already in the set; every time prose defines a term, add it. **If any display uses a term not yet in the set, the lesson fails the gate.** This test is mechanical and must pass before a lesson is published.

---

## 3. Mayer's coherence principle — every visual must earn its place

Richard Mayer's **coherence principle** (a core result of the *cognitive theory of multimedia learning*, Mayer 2001/2009) states: *people learn better when extraneous material is excluded.* Decorative graphics, unrelated images, background flourishes, and "engagement" elements that carry no instructional payload **reduce** learning by competing for working-memory bandwidth. This is one of the most robustly replicated findings in instructional psychology.

**Operational consequences for ed:**

- **No decorative visuals. Ever.** Every `Figure`, `Chart`, `Mermaid` diagram, `Manim` animation, and `YouTube` embed must carry instructional content that the surrounding prose does not — and could not as efficiently. If removing the visual loses nothing, remove it.

- **Engagement is not learning.** A flashy element that makes the page *feel* rich but teaches nothing is a coherence violation, not a feature. Reject "this looks nice here" as a justification. The only valid justification is "the reader understands X better *because* of this element."

- **Every visual must earn its place — the earn-its-place test.** For each visual, state (to yourself, in the plan) the one sentence: "This element exists so the reader can *[verb]* *[specific concept]*, which prose alone conveys poorly because *[reason: it is spatial / sequential / quantitative / dynamic]*." If you cannot write that sentence, cut the element.

- **Prefer interactive over static** — but interactivity is a *tiebreaker among earned visuals*, not a substitute for earning the place. A `Manim` animation earns its place when the concept is *dynamic* (a distribution shifting, a vector rotating, gradient descent stepping); a `Chart` when the point is *quantitative comparison*; a `mermaid` diagram when the structure is *topological* (what connects to what); `QA` when the goal is *retrieval practice*. Match the modality to the concept's character (Mayer's modality and multimedia principles), then prefer the interactive realization.

- **Redundancy principle corollary:** do not narrate a diagram by restating every node in prose. The prose sets up and interprets; the diagram carries the structure. Saying the same thing in both channels adds load without adding learning.

---

## 4. Progressive disclosure — reveal complexity in earned layers

Build every concept in four ordered layers. Never skip a layer; never invert the order.

1. **Intuition** — the analogy or scenario (Section 1). The reader leaves this layer with a correct *mental model*, even if imprecise.
2. **Minimal formalism** — the smallest correct formal statement. The simplest equation, the two-line pseudocode, the smallest runnable example. Just enough to make the intuition precise.
3. **Full detail** — the complete derivation, the full algorithm, the real implementation, the assumptions made explicit.
4. **Edge cases and failure modes** — where it breaks, the numerical pathologies, the boundary conditions, the "but in practice…" caveats that separate a graduate understanding from a textbook-toy one.

**Disclosure discipline:**

- **Hide answers behind `<QA>`.** Any self-check question's answer goes inside a `<QA question="…">…</QA>` block so the reader attempts retrieval before seeing the answer. Retrieval practice *before* feedback is one of the strongest known learning interventions (the testing effect; Roediger & Karpicke, 2006). Never print a question and its answer as adjacent visible prose.

- **Never forward-reference.** Each layer and each section may depend only on material already introduced. If a lesson needs concept Y to explain concept X, either introduce Y first or restructure. A forward reference ("we'll see later why this matters") is a scaffolding break — the reader hits an undefined idea. The only permitted forward reference is an explicit *pointer to a later module* for genuinely out-of-scope depth, phrased as such.

- **Smallest complete version first.** Within any section, open with the smallest version of the idea that is still *correct and complete*, then extend. Not a wrong simplification you later retract — a true special case you later generalize.

---

## 5. The rhythm rule — never wall-of-text

Sustained prose exceeds most readers' engagement and comprehension budget, and it wastes the interactive medium. **No more than three consecutive paragraphs of pure prose without an intervening non-text element** (a diagram, code block, equation display, chart, `Notice`, `QA`, figure, or list that carries real content — not a decorative one, per Section 3).

- **Vary the element types.** Do not follow every prose block with the same device. A page that is prose-then-code, prose-then-code, prose-then-code is monotonous and under-uses the medium. Alternate: a diagram here, a `QA` there, a chart, a worked equation, a `Notice` for a caveat. Variety sustains attention (a novelty/attention effect) and matches different concepts to their best modality.
- **The rhythm rule is a floor, not a quota.** It sets a *maximum* prose run, not a minimum element count. Do not insert filler elements to satisfy it — that violates Section 3. If three paragraphs pass with no natural visual, that is a signal the material is either under-explained or genuinely belongs as prose; interrogate which before adding anything.
- Lists count as a non-text element only when they *restructure* information (steps, a taxonomy, a comparison), not when they are prose sentences wearing bullet costumes.

---

## 6. Reading-level ladder — anchored at graduate

ed writes for graduate students. The register is calibrated, not accidental. This ladder defines the anchor and the (rare) deviations.

**Graduate anchor (the default for all lessons, quizzes, and projects):**

- **Sentence length:** 20–35 words is normal; occasional longer sentences with subordinate clauses are fine when the logic requires them. Do not artificially shorten sentences the way a tutorial would.
- **Vocabulary:** full domain jargon is permitted and expected — *after* its first definition (Section 2). No glossary-avoidance; use "eigenspectrum," "conjugate prior," "Lipschitz constant," "auto-differentiation" freely once introduced.
- **Example density:** at least one concrete worked example per major concept, with full intermediate steps (Section 7). Graduate readers learn from worked examples faster than from abstract statements (the worked-example effect; Sweller & Cooper, 1985).
- **Theoretical depth:** derivations are shown, not asserted. Assumptions are stated. Connections to the primary literature are made inline (Section 8). Complexity/convergence/generalization results are given with their conditions.

**LaTeX delimiters — hard rule.** Inline math uses `\( … \)`; display math uses `\[ … \]`. **Never** use `$…$` or `$$…$$` — the diffbook/MDX pipeline expects the backslash-paren/backslash-bracket delimiters and dollar delimiters render incorrectly. Example inline: `\( \nabla_\theta \mathcal{L} \)`. Example display:
```
\[
  \theta_{t+1} = \theta_t - \eta \, \nabla_\theta \mathcal{L}(\theta_t)
\]
```

**Permitted deviations from the anchor:** the *intuition* layer of a concept (Section 4, layer 1) may briefly drop to a plainer register to establish the mental model — short sentences, everyday words. This is deliberate and temporary; the section climbs back to the graduate anchor by the minimal-formalism layer. Never let the *whole* lesson drift down to tutorial register — that is a depth failure.

---

## 7. Robust code examples — code as a teaching artifact

Code in an ed lesson teaches; it is not decoration and it is not a fragment to be completed by imagination. Apply the same progressive-disclosure discipline (Section 4) *inside* the code.

- **Minimal runnable core first, then extend.** Open with the smallest *complete, runnable* version — a snippet a reader could paste and execute and see the claimed result. Then, in later blocks, extend it toward the real implementation. Do not open with the fully-optimized production version.

- **Full runnable snippets, not fragments.** Every code block should stand on its own: imports present, variables defined, no `...` placeholders standing in for load-bearing logic. If a reader cannot run it, it does not teach reliably — it teaches an *illusion* of understanding. (Ellipses are acceptable only for genuinely irrelevant boilerplate, and only when the omission is labeled.)

- **A plain-language bridge sentence precedes every block** (Section 2): name the key variables and what the block computes, so the reader predicts before reading.

- **Comments that teach, not comments that narrate.** `# add 1 to i` is noise. `# clip gradients so a single bad batch can't blow up the update (see Pascanu et al., 2013)` teaches. Comment the *why* and the *non-obvious*, never the syntactically obvious.

- **Show intermediate outputs.** After the block, show what it prints/returns — actual shapes, actual numbers, an actual plot description. "Running this prints `loss=2.31` at step 0 and `loss=0.44` at step 500; note the elbow near step 120." Seeing the intermediate state is where the learning happens; a result asserted without its trace is a claim, not a demonstration.

- **Prefer a language/framework consistent with the sourced material** (the OCW course's language, the textbook's pseudocode conventions) so the reader can cross-reference the primary source directly.

---

## 8. Grounding and references — cite primary sources inline

An intelligent textbook is trustworthy because its claims are traceable. ed grounds every non-trivial claim in a primary source, cited inline at the point of use.

- **Cite inline, at the claim.** Not a bibliography dump at the end — the citation sits where the claim is made, so the reader can verify *this* sentence. "Batch normalization (Ioffe & Szegedy, 2015) accelerates training primarily by smoothing the loss landscape (Santurkar et al., 2018), not by reducing internal covariate shift as originally proposed."

- **Prefer, in order: papers → OCW/course notes → textbooks → reputable technical blogs.** The reliability hierarchy and the six source *classes* live in `source-tiers.md`; this file defers to it for the catalog and the verification rules. Do not re-specify source policy here — read `source-tiers.md`.

- **Use the right diffbook affordance for each reference:** a `Bookmark` for a verified URL you want to feature (renders a rich card), a `YouTube` embed for a specific lecture, plain inline Markdown links for in-flow citations. Every URL you cite must have been verified per `source-tiers.md` (dead links are a gate failure).

- **Textbooks are cited without fragile URLs** — title, author, publisher, edition — since their canonical URLs rot. See `source-tiers.md`.

---

## 9. Reinforce — every major concept ends with a check

Retrieval practice is among the highest-yield learning interventions known (the testing effect; Roediger & Karpicke, 2006; Karpicke & Blunt, 2011). ed therefore closes every major concept with an active check, not a passive summary.

- **Every major concept ends with a `<QA>` self-check or a question.** The answer is hidden (Section 4) so the reader attempts retrieval before seeing it. Phrase the question to test *understanding or transfer*, not recall of a phrase — "Why would raising the softmax temperature hurt a distillation objective?" beats "What is temperature?"
- **Module-level review is a `Quiz`** (grouped, scored) authored by `create-quiz` with a Bloom-calibrated question mix — see `blooms-taxonomy.md`.
- **Prefer worked examples with every intermediate step** over stated results (Section 7), and prefer "predict, then reveal" over "here is the answer."
- A concept with no check is incomplete. This is enforced by the lesson gate.

---

## 10. Soft-wrap rule — one line per paragraph

- Write each paragraph as a single continuous line. Do **not** insert manual mid-paragraph newlines to wrap at a column width — hard breaks reflow badly on narrow screens and in non-reflowing renderers, and they corrupt MDX diffs. Let the renderer wrap.
- Newlines still separate paragraphs, list items, headings, and fences. mermaid blocks, LaTeX displays, code blocks, and ASCII diagrams keep their own internal line structure. Only *mid-paragraph* line breaks in prose are forbidden.

---

## Lesson self-check (the author runs this before publishing)

A lesson is ready only when **all** of the following hold:

1. **Feynman test** (Section 1) passes — followable top to bottom *and* reaches graduate depth.
2. **Top-to-bottom vocabulary test** (Section 2) passes — no display uses an undefined term.
3. **Coherence** (Section 3) — every visual passes the earn-its-place test; no decorative elements.
4. **Progressive disclosure** (Section 4) — four layers present and ordered; no forward references; answers hidden behind `<QA>`.
5. **Rhythm** (Section 5) — no run of more than three pure-prose paragraphs; element types varied.
6. **Register** (Section 6) — graduate anchor held; LaTeX uses `\( \)` / `\[ \]`, never `$`.
7. **Code** (Section 7) — every block runnable, bridged, commented-to-teach, with intermediate outputs shown.
8. **Grounding** (Section 8) — every non-trivial claim cited inline; every URL verified per `source-tiers.md`.
9. **Reinforcement** (Section 9) — every major concept ends with a check.
10. **Soft-wrap** (Section 10) — one line per paragraph.

Any failure → fix and re-run. This checklist is the lesson quality gate; see `quality-gates.md` for scoring and STOP behavior.
