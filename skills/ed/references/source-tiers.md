# Source tiers — the reference catalog spec

ed produces *literature-grounded* textbooks. Every module must rest on real, verifiable, high-quality primary material — not on the model's parametric memory. This file defines the six source **classes** ed seeks, the **reliability hierarchy** that orders them, the **hard rules** every catalog must satisfy, and the exact schema of the `sources.md` catalog that `explore` writes and every downstream workflow reads.

This verified-reference discipline is core to the intelligent-textbook lineage (dmccreary): an AI textbook is only trustworthy when its sources are real, reachable, and annotated with *what they cover and why they matter*.

---

## The six source classes

Each class has a role. A strong course draws from several; a strong *module* names at least one primary **text** source (hard rule below) plus a mix of the rest.

### (a) Open / available textbooks

Canonical, comprehensive, peer-reviewed treatments. The spine of a module. **Cited without fragile URLs** — give *title, author(s), publisher, edition* (and chapter/section when relevant), because textbook URLs rot and paywalls vary by reader. Prefer texts with a legitimately free online edition, but cite by bibliographic identity regardless.

*Canonical examples:*
- Goodfellow, Bengio & Courville, *Deep Learning*, MIT Press, 2016 (free HTML edition).
- Bishop, *Pattern Recognition and Machine Learning*, Springer, 2006 (PRML).
- MacKay, *Information Theory, Inference, and Learning Algorithms*, Cambridge, 2003 (ITILA; free PDF).
- Boyd & Vandenberghe, *Convex Optimization*, Cambridge, 2004 (free PDF).
- Sutton & Barto, *Reinforcement Learning: An Introduction*, 2nd ed., MIT Press, 2018.

### (b) OCW — OpenCourseWare and official course sites

Full university courses with lecture notes, slides, problem sets, and often exams. **MIT OpenCourseWare first** (`ocw.mit.edu`) — it is the most complete and stable — then **Stanford** (cs231n, cs224n, cs229), **CMU**, **Berkeley**, and other reputable departments. These supply the *pedagogical structure* and the *real assignments* that `create-project` adapts.

*Canonical examples:*
- MIT OCW 6.036 / 6.390 Introduction to Machine Learning; 18.06 Linear Algebra (`ocw.mit.edu`).
- Stanford CS231n (CNNs for Visual Recognition), CS224n (NLP with Deep Learning), CS229 (Machine Learning).
- CMU 10-701 / 11-747; UC Berkeley CS182 / CS285.

### (c) Papers — primary research literature

The frontier and the seminal record. Prefer **arXiv**, **ACL Anthology**, **NeurIPS / ICML / ICLR proceedings**, and **JMLR**, plus the field-defining seminal papers regardless of venue. Cite author-year inline (Section 8 of `pedagogy.md`) and feature key papers as `Bookmark`s.

*Canonical examples:*
- Vaswani et al., "Attention Is All You Need," NeurIPS 2017 (arXiv:1706.03762).
- Kingma & Ba, "Adam," ICLR 2015 (arXiv:1412.6980).
- He et al., "Deep Residual Learning," CVPR 2016 (arXiv:1512.03385).

### (d) GitHub repositories

Reference implementations, official course code, and problem sets. Use for runnable code the reader can cross-reference, and as the source material `create-project` adapts. Prefer *official* course repos and *canonical* reference implementations over random forks; check stars, recency, and license.

*Canonical examples:*
- `karpathy/nanoGPT`, `karpathy/minGPT` — minimal, readable reference implementations.
- Official course repos (e.g. the CS231n assignment starter repos).
- Paper-companion repos linked from the paper itself.

### (e) YouTube lecture series — named course playlists

Full, named lecture playlists — not one-off clips. Best for concepts that are *dynamic* or benefit from a lecturer's live derivation. Embed specific lectures with `YouTube` (Section 3 of `pedagogy.md`), with chapter timestamps when useful.

*Canonical examples:*
- 3Blue1Brown, "Neural Networks" and "Essence of Linear Algebra" series.
- Stanford CS231n / CS224n official lecture playlists.
- MIT 6.S191 (Introduction to Deep Learning) lecture playlist.

### (f) Reputable blogs / notes

High-quality explanatory writing and canonical course notes. Use for exceptionally clear expositions and interactive explainers — *never* as the sole grounding for a claim that a paper or textbook should back.

*Canonical examples:*
- distill.pub (peer-reviewed interactive explainers).
- Lil'Log (Lilian Weng), colah's blog (Christopher Olah).
- Canonical course notes: the CS231n / CS229 lecture notes.

---

## Reliability hierarchy (ordering)

When two sources support the same claim, prefer the higher tier. When *grounding* a module, cover the top of this hierarchy first.

1. **Peer-reviewed textbooks** (class a) and **seminal / peer-reviewed papers** (class c) — highest authority; the default grounding for any non-trivial claim.
2. **OCW / official course material** (class b) — authoritative pedagogical structure and vetted assignments.
3. **Official / canonical GitHub reference implementations** (class d) — authoritative for *how* something is implemented.
4. **Peer-reviewed interactive explainers** (distill.pub) and **canonical course notes** (upper class f/b) — authoritative exposition.
5. **Named university lecture playlists** (class e) — authoritative but harder to cite precisely; pair with a text source.
6. **Reputable individual blogs** (lower class f) — supporting exposition only; must be backed by a higher tier for any load-bearing claim.

A claim's grounding should never rest *solely* on tier 5 or 6. Papers and textbooks carry the load; blogs and videos illuminate.

---

## Hard rules

These are gate conditions. A catalog that violates any of them fails the `explore` / syllabus gate (see `quality-gates.md`).

1. **≥1 primary text source per module.** Every module in the course-wide catalog must name at least one class-(a) textbook or class-(b)/tier-1 course-notes source as its primary text. A module grounded only in blogs and videos is rejected.

2. **Verify every online URL via WebFetch before inclusion.** Every entry with a URL must be fetched and confirmed live and on-topic *before* it enters the catalog. **Dead or redirected-to-unrelated → drop it or replace it** with a live equivalent. Never ship an unverified link. (Textbooks cited bibliographically per class (a) have no URL to verify.)

3. **20–40 word annotation for every entry**, stating both **what it covers** and **why it is relevant** to the specific module. Not a title restatement — a substantive note a downstream author can act on.

4. **Textbooks cited without fragile URLs** — title, author(s), publisher, edition (per class a).

---

## Annotation: good vs bad

**Bad** (11 words, restates the title, no *why*):
> Goodfellow et al. *Deep Learning*. A textbook about deep learning.

**Good** (31 words, says *what* and *why*, module-specific):
> Goodfellow et al., *Deep Learning*, ch. 6–8: the definitive treatment of feedforward nets, backpropagation, and regularization. Grounds this module's derivation of backprop and its discussion of why depth helps generalization.

The good annotation names the exact chapters, states what those chapters cover, and connects them to *this module's* specific needs — enough for `create-lesson` to open the right pages.

---

## The `sources.md` catalog schema

`explore` writes `.codevoyant/ed/{course}/explore/sources.md`. It has two parts: a **course-wide table** (every vetted source, one row each) and **per-module sections** (which sources ground each module, with the required ≥1 primary text called out). `plan-module` later writes per-module shortlists to `explore/modules/{NN-slug}.md` drawing from this catalog.

### Part 1 — course-wide source table

```markdown
## Sources

| Title | Class | URL or citation | Module relevance | Verified | Annotation |
|---|---|---|---|---|---|
| Goodfellow et al., *Deep Learning* (MIT Press, 2016) | a | Goodfellow, Bengio, Courville; MIT Press; 2016 | 01, 03, 04 | n/a (book) | Definitive text on feedforward nets, backprop, and regularization; grounds the backprop derivation and the depth-vs-generalization discussion in modules 1, 3, 4. |
| Vaswani et al., "Attention Is All You Need" | c | https://arxiv.org/abs/1706.03762 | 05 | ✅ 2026-07-18 | Introduces the transformer and scaled dot-product attention; the primary source for module 5's attention derivation and the \( \sqrt{d_k} \) scaling rationale. |
| Stanford CS231n | b | https://cs231n.github.io/ | 02, 03 | ✅ 2026-07-18 | Course notes + assignments on CNNs and optimization; supplies module 2/3 pedagogical structure and the problem sets create-project adapts. |
| karpathy/nanoGPT | d | https://github.com/karpathy/nanoGPT | 05, 06 | ✅ 2026-07-18 | Minimal readable GPT implementation; the reference code module 5/6 lessons cross-reference and the project extends. |
| 3Blue1Brown, "Neural Networks" | e | https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi | 01 | ✅ 2026-07-18 | Visual, dynamic build-up of what a neural network computes; embedded in module 1 to give intuition before the formalism. |
| distill.pub, "Attention and Augmented RNNs" | f | https://distill.pub/2016/augmented-rnns/ | 05 | ✅ 2026-07-18 | Peer-reviewed interactive explainer of attention mechanisms; supports (does not solely ground) module 5's intuition layer. |
```

Column rules:
- **Class** — one of `a`–`f`.
- **URL or citation** — a verified URL, or (class a) a bibliographic citation with no URL.
- **Module relevance** — comma-separated zero-padded module numbers (`01, 03`).
- **Verified** — `✅ {date}` for URL entries (date of the WebFetch check), or `n/a (book)` for bibliographically-cited textbooks.
- **Annotation** — 20–40 words, *what* + *why*, module-specific.

### Part 2 — per-module grounding

```markdown
## Grounding by module

### 01 — Foundations of Neural Networks
- **Primary text:** Goodfellow et al., *Deep Learning*, ch. 6.
- Supporting: 3Blue1Brown "Neural Networks" (intuition); CS231n notes (structure).

### 05 — Attention and Transformers
- **Primary text:** Goodfellow et al., *Deep Learning*, ch. 10 (sequence modeling) + Vaswani et al. 2017 (primary paper).
- Supporting: karpathy/nanoGPT (reference code); distill.pub augmented-RNNs (intuition).
```

Every module section **must** name a `**Primary text:**` line satisfying hard rule 1. If a module cannot find one, `explore` must keep searching or flag the gap — it may not ship the catalog with an ungrounded module.
