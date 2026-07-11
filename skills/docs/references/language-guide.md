# Language Guide

Rules for writing junior-dev-friendly engineering documentation.

## Core Principle

Documentation is for the person joining the team tomorrow with two years of experience.
Not for the person who built the system. Not for a computer science professor.

## Rules

### 1. Define every acronym on first use

Bad: "The app uses OIDC via an M2M flow with RS256 JWT validation."
Good: "The app uses OpenID Connect (OIDC) — an identity layer on top of OAuth 2.0 — to verify who you are. It validates the JSON Web Token (JWT) using the RS256 algorithm (a public-key signature scheme)."

Define once per document, in parentheses after the first use. Not in a glossary at the bottom — by the time the reader gets there, they're already confused.

### 2. One idea per sentence

Bad: "The session cookie, which is HttpOnly and therefore inaccessible to JavaScript running in the browser, contains a base64-encoded JSON object that includes the access token, refresh token, and expiry timestamp, and is validated on every request by re-verifying the JWT signature against Kinde's public JWKS endpoint."

Good:
"The session is stored in an HttpOnly cookie — JavaScript running in the browser cannot read it (this prevents XSS attacks from stealing sessions).
The cookie contains a base64-encoded JSON object with the access token, refresh token, and expiry time.
The server validates this cookie on every request by checking the JWT signature against Kinde's public key."

### 3. Explain the "why" before the "what"

Bad: "Post text is stored in GCS."
Good: "Firestore documents have a 1 MB size limit, which long-form posts would easily exceed. Post text is therefore stored in GCS (Google Cloud Storage), with Firestore holding only a path reference."

### 4. Use "you" (second person) consistently

Bad: "The developer must add their email to `infra/shared/main.tf`."
Good: "Add your email to `infra/shared/main.tf`."

The reader is always "you". Never "the developer", "the user", "one", or passive voice.

### 5. Keep `## Overview` to 3 sentences max

The overview answers three questions:
1. What is this? (one sentence)
2. Where does it live in the codebase? (one sentence)
3. Why does it exist / what problem does it solve? (one sentence)

Everything else goes in Design or Implementation.

### 6. Use tables for lists of 3+ related properties

Bad:
"The cookie is set with HttpOnly=true to prevent XSS. It uses Secure=true in production to require HTTPS. SameSite=Lax is set for CSRF protection."

Good:
| Property | Value | Purpose |
|----------|-------|---------|
| HttpOnly | true | Prevents JavaScript from reading the cookie (XSS protection) |
| Secure | true in prod | Cookie only sent over HTTPS |
| SameSite | Lax | Prevents CSRF attacks |

### 7. Use diagrams to replace, not supplement, prose

If you have a numbered list describing a multi-step flow, replace it with a `sequenceDiagram` or `flowchart`. Keep the numbered list only if the diagram would be harder to read (e.g. a list of 3 simple steps).

The goal is: can a new team member understand the flow in 30 seconds from the diagram alone?

### 8. Avoid impl-detail jargon in Overview and Requirements

- No class names, function names, or file paths in `## Overview`
- No TypeScript generics or internal abstractions in `## Requirements`
- Save those for `## Design` and `## Implementation`

### 9. Code blocks for everything executable

Any command, path, variable value, or snippet that the reader might copy-paste: put it in a code block.

Bad: "Run pnpm install then just dev."
Good: Run `pnpm install` then `just dev`.
Or:
```bash
pnpm install
just dev
```

### 10. Link; don't duplicate

If auth.md already explains the session format, link to it — don't repeat it. Use the `## References` section. Duplication creates maintenance debt.

### 11. Soft-wrap prose — never hard-wrap

Write each paragraph as a single continuous line. Do not insert manual newlines to wrap prose at a fixed column width — on narrow screens and non-reflowing renderers, hard breaks wrap badly. Let the renderer handle wrapping.

Bad (hard-wrapped at ~80 cols):
```
The session is stored in an HttpOnly cookie so JavaScript running in the
browser cannot read it, which prevents XSS attacks from stealing sessions.
```

Good (one paragraph, one line):
```
The session is stored in an HttpOnly cookie so JavaScript running in the browser cannot read it, which prevents XSS attacks from stealing sessions.
```

Newlines still separate paragraphs, list items, headings, and code fences — only mid-paragraph line breaks are forbidden.
