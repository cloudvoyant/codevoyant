# Architecture Overview Template

Use for `docs/architecture/README.md`.
Updated by `dev:plan --update-overview` or when a new feature doc is added.

---

# Architecture Overview

**Updated:** {YYYY-MM-DD}
**Stack:** {language/framework/runtime — e.g. "Node 20, TypeScript, PostgreSQL"}

## System Summary
{2-4 sentences: what this system does, who uses it, scale/deployment context}

## Components

| Component | Path/Boundary | Purpose | Docs |
|---|---|---|---|
| {name} | `{path or service boundary}` | {one sentence} | [{feature}.md](./{feature}.md) |

## Key Architectural Decisions

| Decision | Type | Date | Doc |
|---|---|---|---|
| {decision} | ONE-WAY / TWO-WAY | {YYYY-MM-DD} | [{feature}.md](./{feature}.md) |

## Data Stores

| Store | Type | Owner | Notes |
|---|---|---|---|
| {name} | {postgres/redis/s3/etc.} | {component} | {schema location or note} |

## External Integrations

| Integration | Direction | Purpose |
|---|---|---|
| {service} | inbound / outbound / both | {one sentence} |

## Navigation
{Links to all feature docs in this directory}
