# Bloom's revised taxonomy — operationalized for ed

ed uses the **2001 revised Bloom's taxonomy** (Anderson, Krathwohl et al., *A Taxonomy for Learning, Teaching, and Assessing*) as the backbone for learning objectives, per-lesson goals, quiz-question mixes, and capstone projects. The revision renamed the original noun categories to **verbs** and swapped the top two levels so that *Create* — not *Evaluate* — is the apex. This file operationalizes all six levels for graduate technical content, gives the target *distributions* by module position, and specifies exactly how each ed workflow consumes them.

This Bloom-tagging discipline is part of the intelligent-textbook lineage (dmccreary): every learning objective carries a Bloom verb, and every assessment item is written to a target cognitive level so that a module's assessment provably matches its objectives.

The six levels, lowest to highest cognitive demand:

**Remember → Understand → Apply → Analyze → Evaluate → Create**

---

## The six levels for graduate technical content

For each level: a definition, a graduate-context action-verb list, and an example learning objective paired with an example assessment item. The running domain is a graduate deep-learning course, but the pattern transfers to any technical subject.

### 1. Remember — retrieve relevant knowledge from long-term memory

The learner recalls facts, terminology, definitions, and canonical results without necessarily transforming them. At graduate level, "Remember" is rarely an *end* — it is the substrate the higher levels operate on — but it must still be assessed to confirm the vocabulary is in place.

**Action verbs (graduate register):** define, state, list, name, recall, identify, recognize, reproduce, label, match, quote (a result), cite (a source).

**Example objective:** *State the definition of a positive-definite kernel and name three kernels that satisfy it.*

**Example assessment item (single-choice):** "Which of the following is a necessary condition for a function \( k(x, x') \) to be a valid Mercer kernel?" — with the correct answer being *symmetry and a positive semi-definite Gram matrix*, distractors targeting real misconceptions (e.g. "differentiability," "boundedness").

### 2. Understand — construct meaning; explain, interpret, exemplify

The learner explains ideas in their own words, interprets a formula, translates between representations, summarizes, and gives their own examples. This is the Feynman level — "explain it simply" is an *Understand*-level demand.

**Action verbs:** explain, describe, interpret, summarize, paraphrase, classify, compare, contrast, exemplify, infer (meaning), predict (qualitatively), distinguish.

**Example objective:** *Explain why layer normalization removes the batch-size dependence that batch normalization introduces.*

**Example assessment item (short answer / `QA`):** "In one paragraph, explain what the temperature parameter in a softmax controls, and describe the two limiting behaviors as temperature → 0 and temperature → ∞."

### 3. Apply — use a procedure in a given situation

The learner executes or implements a known method on a concrete, often novel, instance: runs an algorithm, computes a quantity, implements a formula in code, applies a theorem to a specific case.

**Action verbs:** compute, calculate, implement, apply, execute, solve, use, derive (a specific instance), simulate, demonstrate, construct (a small example).

**Example objective:** *Compute one step of gradient descent on the logistic-regression loss for a given two-point dataset and learning rate.*

**Example assessment item (numeric):** "Given \( w = 0.5 \), a single example \( (x=2, y=1) \), and learning rate \( \eta = 0.1 \), compute \( w \) after one gradient-descent step on the logistic loss (answer to two decimals)." — a `NumericQuestion` with tolerance.

### 4. Analyze — break material into parts; determine how parts relate

The learner decomposes a system, distinguishes relevant from irrelevant factors, attributes causes, finds structure, and diagnoses. This is where graduate work concentrates: *why* does this method behave this way, *what* interacts with *what*.

**Action verbs:** analyze, decompose, differentiate, attribute, diagnose, deconstruct, contrast (mechanistically), trace, isolate (a variable), relate, distinguish (cause from correlation).

**Example objective:** *Analyze how the choice of positional-encoding scheme interacts with a transformer's ability to extrapolate to longer sequences than seen in training.*

**Example assessment item (multiple-choice):** "A transformer trained with sinusoidal positional encodings degrades sharply on sequences longer than training length. Select ALL factors that plausibly contribute." — a `MultipleChoiceQuestion` with several genuinely-contributing options and plausible non-contributors.

### 5. Evaluate — make judgments based on criteria and standards

The learner critiques, justifies a choice against stated criteria, checks a design for soundness, compares approaches on principled grounds, and defends a position. Evaluation requires an explicit *criterion* — "better" is meaningless without "better *for what.*"

**Action verbs:** evaluate, critique, justify, defend, judge, appraise, argue, recommend (with justification), assess (a tradeoff), select (and defend), weigh.

**Example objective:** *Given a latency budget and a labeled-data budget, justify a choice between fine-tuning a large model and training a small model from scratch.*

**Example assessment item (short essay / `QA`):** "You must deploy a classifier under a 10 ms latency budget with only 5,000 labeled examples. Argue for either full fine-tuning of a 7B model or a distilled small model, citing at least two criteria and the tradeoff between them."

### 6. Create — put elements together into a novel, coherent whole

The learner designs, synthesizes, and produces something new: a novel architecture, an experimental protocol, a proof, an original system. This is the apex and the natural home of a capstone project.

**Action verbs:** design, synthesize, construct (a novel artifact), formulate, propose, devise, compose, generate (a hypothesis), architect, develop, plan (an experiment), invent.

**Example objective:** *Design and justify an experimental protocol that would distinguish whether a model's gains come from scale or from a specific architectural change.*

**Example assessment item (project):** a `create-project` capstone — "Propose, implement, and evaluate a modification to the baseline model that targets one named weakness; report an ablation that isolates your change's contribution."

---

## Target distributions by module position

The right cognitive mix depends on *where a module sits in the course*. Early modules build vocabulary and mechanics; late modules demand judgment and synthesis. ed targets three profiles. Numbers are percentages of assessment weight (and, loosely, of objective count) across the six levels in the fixed order **Remember / Understand / Apply / Analyze / Evaluate / Create**.

| Module position | Remember | Understand | Apply | Analyze | Evaluate | Create |
|---|---|---|---|---|---|---|
| **Introductory** (early) | 40 | 40 | 15 | 5 | 0 | 0 |
| **Intermediate** (mid) | 25 | 30 | 30 | 15 | 0 | 0 |
| **Advanced** (late) | 15 | 20 | 25 | 25 | 10 | 5 |

Reading the profiles:

- **Introductory** modules are 80% Remember+Understand: get the vocabulary and mental models solid. Almost no Analyze; no Evaluate/Create — there is not yet enough scaffolding to judge or synthesize.
- **Intermediate** modules shift weight into **Apply** (peak 30%) and introduce **Analyze**: the learner now *uses* the methods and starts taking them apart.
- **Advanced** modules spread across the top: **Analyze** peaks (25%), and **Evaluate** (10%) and **Create** (5%) appear — the learner now judges tradeoffs and synthesizes novel work.

These are targets, not exact quotas. `create-quiz` enforces them within a **±15 percentage-point tolerance** per level (Section below); objectives and per-lesson goals should *approximate* the profile without pedantic counting.

---

## How each ed workflow consumes this

### plan-syllabus — objectives carry Bloom verbs

For each module, `plan-syllabus` writes learning objectives whose lead verb is a Bloom action verb from the lists above. It first infers the module's **position** (see "Inferring position" below), then drafts objectives whose Bloom-level *mix approximates that position's profile*. An introductory module's objectives cluster at *state / explain*; an advanced module's include *analyze / evaluate / design*. The syllabus gate (see `quality-gates.md`) checks that the *program as a whole* covers all six levels somewhere and that each module's objectives are not miscalibrated for its position (e.g. an intro module demanding *Create* is a red flag).

### plan-module — per-lesson goals inherit and refine

`plan-module` takes the module's objectives and expands them into per-lesson goals, each tagged with a Bloom level. It ensures the lessons *collectively* realize the module's target profile: a mostly-Understand intro module has lessons dominated by *explain/interpret* goals, with the single *Apply* lesson clearly marked. Each lesson goal's Bloom tag later tells `create-lesson` what kind of check to end on (a *Remember* concept ends on a recall `QA`; an *Analyze* concept ends on a decomposition prompt).

### create-quiz — question mix, ±15% tolerance

`create-quiz` reads the module's position profile and builds the quiz so that each question's Bloom level, weighted, lands **within ±15 percentage points of the target** for every level. Concretely: a Remember question maps to a recall single-choice item; Understand to an explain/interpret item; Apply to a numeric or "compute the result" item; Analyze to a multi-factor `MultipleChoiceQuestion` or diagnosis; Evaluate to a justify/critique short-answer `QA`; Create is generally *not* placed in an auto-graded quiz (it lives in the project) but a "propose/design" `QA` may stand in for it at the advanced level. The quiz gate verifies the realized distribution against the target within tolerance and flags any level out of band.

### create-project — Create-level capstones

`create-project` authors the module's top-of-taxonomy assessment: a **Create**-level task (design, synthesize, propose-and-build) with an **Evaluate** component baked in (the learner must justify design choices against criteria). Projects are the primary home for Evaluate and Create, which is why the quiz distributions keep those levels low even in advanced modules — the cognitive apex is carried by the project, not the quiz. Projects are grounded in *real sourced assignments* (OCW problem sets, official course repos — see `source-tiers.md`), adapted to be Create-level.

---

## Inferring a module's position

A module's position (Introductory / Intermediate / Advanced) is not the raw index in the list — it is a function of two signals:

1. **Depth in the dependency order.** After `plan-syllabus` topologically orders modules by prerequisite, a module's *depth* is how many prerequisite layers precede it. Zero-prerequisite (foundational) modules are Introductory candidates; modules deep in the chain, with many prerequisites, are Advanced candidates. (The "smell test" in `quality-gates.md` guards against inverted ordering — if a supposedly foundational module reads as advanced, the dependency direction is wrong.)

2. **Concept centrality.** Independently, weigh how *central and downstream-enabling* the module's concepts are. A module that many later modules depend on is more foundational (pulls toward Introductory) even if it appears a little later; a specialized module that nothing depends on and that assumes everything before it is terminal (pulls toward Advanced).

**Heuristic mapping** for a course of \( M \) modules in dependency order:

- Roughly the first third by depth, and any zero-prerequisite module → **Introductory** (40/40/15/5/0/0).
- The middle third → **Intermediate** (25/30/30/15/0/0).
- The last third by depth, and any terminal/high-prerequisite specialized module → **Advanced** (15/20/25/25/10/5).

Adjust by centrality: a highly central module late in the list may still warrant an Intermediate (not Advanced) profile because it is foundational for what follows; a niche module that appears mid-list but depends on everything and enables nothing may warrant Advanced. When depth and centrality disagree, record the chosen position and the reason in the syllabus so downstream workflows use the same call.
