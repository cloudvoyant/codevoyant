# PR voice & tone

How to write PR/MR descriptions (and any prose this skill generates). The reader is often a busy teammate or a **junior developer** seeing this change for the first time. Write for them.

## Principles

- **Terse.** Short sentences. One idea each. Break up long, flowing sentences — if it has more than one comma or an "and… and…", split it. Cut filler ("in order to" → "to", "is able to" → "can"). Bullets over paragraphs.
- **Say the problem and the ask — skip the play-by-play.** One or two short sentences. Don't walk through the whole mechanism or every consequence; the reader can read the code. A code suggestion often says it better than a paragraph.
- **Human, not robotic.** Sound like a considerate colleague, not a generator. Drop AI/boilerplate phrasing ("This PR aims to…", "It is worth noting that…").
- **Junior-dev friendly.** Assume the reader knows the language but not this corner of the codebase. Say *why*, not just *what*. Expand an acronym or link a doc the first time it matters.
- **Respectful and collaborative.** Neutral, courteous. Note trade-offs plainly. It's fine to ask for a second opinion.
- **No sarcasm or rhetorical flair.** No rhetorical questions. No hype words ("blazingly fast", "massive", "simply", "just"). No exclamation spam.
- **Link references when they help.** A URL to the relevant doc, RFC, issue, ADR, or prior art — when it saves the reader a search or justifies a decision. Skip links that add nothing.

## Practical rules

- Lead with the point. First words say what changed and why.
- Active voice. Plain imperative or "this change". Avoid stiff passive.
- One idea per bullet. No walls of text.
- Concrete nouns (file, function, endpoint), not vague ones ("various things", "some logic").
- Flag what a reviewer should look at closely — risky area, follow-up, known limitation — in plain words.

## Before / after

Avoid (robotic, verbose, hype, long sentences):
> This PR introduces a comprehensive and robust refactor that dramatically improves the authentication subsystem, and it is worth noting that we have leveraged a powerful new pattern in order to achieve this. Isn't that great?

Prefer (terse, human, respectful, with a reference):
> Moves token validation into `authMiddleware`. Every route now checks tokens the same way. Before, each handler validated on its own — that's how the expiry bug in #214 slipped through. Follows the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Look closely at `refreshToken()`: it changes the retry path.

## Review comments

Same voice, even tighter. A review comment is usually **one or two short sentences**: name the problem, then the ask. Skip the mechanism walk-through. Add a code suggestion when it's clearer than words.

Avoid (verbose — explains the whole mechanism and every consequence):
> Any logged-in user can POST any pathname they want here and it'll get saved to the DB. That means someone could record a path to another user's file, or a completely made-up URL, and it shows up as a legitimate upload in their feed. You should validate that the pathname looks like something `@vercel/blob` would actually produce:

Prefer (terse — problem + ask):
> This will accept any pathname at all, even fake ones. Worth validating.

Then, if it helps, a short code suggestion — not a paragraph.

## Bugfix descriptions

Bugfix bodies (`pr-bug.md`, used by `/pr open --bug` or a `fix/`/`bug/` branch) have three extra rules on top of the voice above:

- **Show the failure.** The Summary must quote a real snippet of the failing test or exception — the failing assertion, stack trace, or error output. Quote it; don't paraphrase.
- **Prove the cause.** Every Root Cause claim needs evidence under it: debug-log output, before/after values, or a captured stack trace. No bare claims.

Keep Root Cause and Changes especially terse — short plain sentences, one idea per bullet. State the cause, then prove it. See `references/workflows/open.md` Step 3.6 for how to gather the snippet and evidence. (Feature descriptions are unaffected.)

---

Keep the structure the template provides. Apply this voice to the prose you fill in.
