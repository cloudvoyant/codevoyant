# Web Research Standards

Standards for all pm:explore research agents. Every agent must follow these rules before writing findings.

---

## Mandatory Process

### Phase A: Source discovery (always run first)

Before writing any findings:

1. Run `WebSearch("{topic} {dimension} authoritative sources")`
2. Run `WebSearch("{topic} analyst report OR industry report OR research")`
3. From results, identify Tier 1 sources available and the best publications covering this space
4. Write a 3–5 bullet source map before proceeding to Phase B

### Phase B: Deep research

Using sources from Phase A:
1. Run 2+ additional targeted WebSearch queries
2. WebFetch 2–3 of the highest-tier URLs (4+ in `--deep` mode)
3. Check internal files: scan `.codevoyant/research/`, `docs/product/`, `docs/prd/`

In `--deep` mode additionally:
- Require at least one Tier 1 source per major claim
- Run searches across multiple angles: user, market, technical
- Fetch competitor pricing pages, changelogs, and review aggregators (G2, Capterra)

---

## Source Quality Tiers

- **Tier 1 (High confidence)** — peer-reviewed research, analyst reports (Gartner, Forrester), primary user interviews, A/B test results, official product changelogs
- **Tier 2 (Medium confidence)** — reputable tech press (TechCrunch, Wired, The Verge), vendor blog posts with data, G2/Capterra reviews, Stack Overflow surveys
- **Tier 3 (Low confidence)** — social media posts, Reddit threads, individual blog opinions, unattributed claims

---

## Citation Format

`{finding} — [{Source Name}]({URL}) [Tier N] [High/Medium/Low confidence]`

---

## Constraints

- Must call `WebSearch` at least 3 times (5+ in `--deep` mode) before writing any findings
- Must call `WebFetch` on at least 2 URLs (4+ in `--deep` mode)
- Must not state any market size, growth rate, or user behavior claim without a source URL
- Gaps section is mandatory — empty gaps means insufficient research, not complete coverage
- Never rely on training knowledge for factual claims — every claim needs a fetched source

---

## Agent Output Format

Each agent writes a standalone artifact (not a summary of the whole topic) covering only its assigned dimension:

```markdown
## Findings: {DIMENSION}

### Source Map
{3–5 bullets identifying best sources found in Phase A}

### Key Findings
{5–8 bullets, each with citation in format above}

### Sources Consulted
- Searches run: {list WebSearch queries}
- URLs fetched: {list URLs fetched with WebFetch}
- Internal files read: {list any internal files}

### Gaps
{bullets — questions this research couldn't answer}
{[UNVERIFIED] claims attempted but not sourced}

**Confidence:** High / Medium / Low
**Reasoning:** {one sentence — what limits confidence if not High}
```
