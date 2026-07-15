<!-- Voice: terse, human, junior-dev friendly. Short sentences. No hype or AI boilerplate. Link refs when they help. See references/voice.md. -->

## Intent

{One short paragraph: what this branch sets out to fix and why. Derived from the diff AND any spec plan run on this branch (Step 2.5). Plain words a new teammate would understand — no plan paths or phase numbers.}

## Summary

{What was happening and why it was wrong — a few short sentences. Then embed a short snippet of the ACTUAL test failure or exception that motivated the fix: the failing assertion, the stack trace, or the error output. Keep it to the few lines that matter.}

<!-- REQUIRED for bugfix PRs: Summary MUST include a fenced snippet of the real failure that motivated the fix. Paste the failing assertion, the exception/stack trace, or the error/CI output — trimmed to the load-bearing lines. Do not paraphrase it; quote it. If you truly cannot find it, leave a `TODO: paste failing test output / exception here` marker (an HTML comment) rather than omitting the section. Example shape:

    ```
    FAIL  src/auth/login.test.ts > rejects expired token
    AssertionError: expected 401 but got 200
      at Object.<anonymous> (src/auth/login.test.ts:42:24)
    ```
-->

Fixes: #{issue number or Linear ID}

## Root Cause

{The cause of the bug, stated plainly. One claim per short sentence. Under each claim, show the evidence that proves it.}

<!-- REQUIRED for bugfix PRs: EVERY root-cause claim MUST be backed by evidence — bare claims are not allowed. Acceptable evidence, shown in a fenced block right under the claim:
  - debug-logging output that reveals the faulty value/flow,
  - before/after values or snapshots (what the code produced vs. what it should have), or
  - a captured stack trace demonstrating the faulty behavior.
Voice: terse and junior-dev friendly. Short plain sentences, one idea each. No dense multi-clause paragraphs. Say the cause, then prove it. Example shape:

    The token TTL was read as seconds but compared as milliseconds. So every token looked already-expired.

    ```
    debug: now=1719878400000  expiresAt=1719878460   (expiresAt is seconds, now is ms)
    ```
-->

## Changes

- {What changed and why — one idea per bullet. Terse. Junior-dev friendly. No dense prose.}
- {Additional change.}

<!-- Voice for this section: terse, one idea per bullet, short plain sentences. Give the *why* when it is not obvious. No walls of text, no hype. -->

## Validation

- [ ] Bug no longer reproducible with steps from issue
- [ ] {additional regression test}
- [ ] Existing tests pass
