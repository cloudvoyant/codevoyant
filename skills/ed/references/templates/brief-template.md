---
# ed course brief — fill every required field before running plan-syllabus / autodidact.
# Required: topic, level, target_outcomes (≥3), and at least one of preferred_sources / source_material_paths.
topic: ""                    # REQUIRED. The course subject, e.g. "Transformer architectures for NLP"
level: graduate              # REQUIRED. Default graduate; also: advanced-undergraduate, phd-seminar
prior_knowledge: ""          # What the learner already knows (assumed prerequisites), e.g. "linear algebra, Python, basic ML"
target_outcomes:             # REQUIRED, ≥3. Concrete, assessable things the learner can do after the course.
  - ""
  - ""
  - ""
preferred_sources:           # Named sources to prioritise in explore (OCW courses, textbooks, playlists, repos).
  - ""                       # e.g. "MIT 6.S191 Introduction to Deep Learning"
source_material_paths:       # Local files to ground on (PDFs, notes, slides). Absolute or repo-relative paths.
  - ""
constraints: ""              # Scope/time limits, must-cover or must-avoid topics, notation conventions.
module_count:                # Optional. Leave blank to let plan-syllabus decide; else a target integer.
notes: ""                    # Anything else: audience context, tone, assessment emphasis.
---

<!--
FILLED EXAMPLE (delete or replace above):

topic: "Transformer architectures for sequence modeling"
level: graduate
prior_knowledge: "linear algebra, probability, Python, feed-forward and recurrent neural nets"
target_outcomes:
  - "Derive scaled dot-product attention and explain the role of the temperature/scaling factor"
  - "Implement a multi-head self-attention block from scratch in PyTorch"
  - "Analyze positional-encoding schemes and justify a choice for a given task"
  - "Evaluate trade-offs between encoder-only, decoder-only, and encoder-decoder designs"
preferred_sources:
  - "MIT 6.S191 Introduction to Deep Learning (lecture playlist)"
  - "Vaswani et al., 'Attention Is All You Need' (2017)"
  - "'Dive into Deep Learning' (d2l.ai), attention chapters"
  - "Jay Alammar, 'The Illustrated Transformer'"
source_material_paths:
  - "slides/week07-attention.pdf"
constraints: "Cover attention → full transformer → efficient variants; use \\( \\) LaTeX; PyTorch for code."
module_count: 6
notes: "Audience: first-year ML PhD students; emphasize derivations and from-scratch implementation."
-->
