---
name: odin
description: 'Odin programming language recipe lookup. Triggers on: "odin procedures", "odin allocators", "odin error handling", "odin unions", "odin strings", "odin dynamic arrays", "odin matrix math", "odin cli", "odin polymorphism", "how do I ... in odin", "odin recipe", "odin cheatsheet".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required — a deterministic read-and-print reference.
argument-hint: '[topic]'
---

# odin

Fast recipe lookup for the [Odin](https://odin-lang.org) language. Each topic is a small self-contained file under `references/recipes/`. Resolve the query to **one** file, then **read it and print it verbatim** — do not summarize, re-derive, or add commentary. This is a lookup, not a synthesis task.

## Step 0: Parse query

```bash
QUERY="$*"   # everything after /odin
```

## Step 1: Route to one recipe and print it

Resolve in this order, then `Read references/recipes/{slug}.md` and print its contents verbatim:

1. **Exact topic name.** Lowercase `QUERY` and replace spaces with hyphens. If it equals a recipe slug (`procedures`, `returns`, `structs`, `conversions`, `defer`, `allocators`, `errors`, `unions`, `data-structures`, `math`, `strings`, `terminal`, `polymorphism`, `cli`, `resources`), use that file. (So `/odin defer`, `/odin cli`, `/odin data structures` route directly.)
2. **Keyword match.** Otherwise pick the **first** row whose keyword appears in `QUERY` as a **whole word/phrase** (word-boundary, case-insensitive — never a bare substring, so `def` never matches `defer`).

| Keywords in query (whole-word) | Recipe file (`references/recipes/…`) |
|---|---|
| procedure, function, named return, default arg | `procedures.md` |
| return, tuple, multiple result, destructure | `returns.md` |
| struct, using, field, packed | `structs.md` |
| convert, conversion, cast, transmute, distinct, coerce | `conversions.md` |
| defer, cleanup, scope exit | `defer.md` |
| alloc, allocator, memory, free, delete, arena, context, temp, leak, tracking | `allocators.md` |
| error, or_return, or_else, result | `errors.md` |
| union, maybe, tagged, variant, type switch | `unions.md` |
| dynamic array, slice, map, append, data structure | `data-structures.md` |
| vector, matrix, linalg, math, dot, cross, normalize, swizzle | `math.md` |
| string, cstring, strconv, builder, rune, split, concat | `strings.md` |
| print, printf, terminal, tui, board, ansi, fullscreen, screen, color, fmt, stdin, input | `terminal.md` |
| polymorph, generic, parametric, where clause, proc group, any, overload | `polymorphism.md` |
| cli, command line, args, os.args, flags, main, build | `cli.md` |
| resource, learn, book, tutorial, link | `resources.md` |

**No query, or `list` / `index` / `help` / `topics`:** print the index below (do not read any recipe file).

**`all` / `everything` / `cheatsheet`:** print the index and say "pass a topic to print that recipe" — do not dump every file.

### Index (print for no-query)

```
odin — recipe lookup. Usage: /odin <topic>

  procedures        proc decl, default args, named returns
  returns           multiple returns & destructuring
  structs           struct literals, using, #packed
  conversions       cast / transmute / distinct; implicit vs explicit
  defer             defer & LIFO cleanup
  allocators        context allocator, temp, arena, tracking (freeing)
  errors            or_return / or_else, (value, Error) idiom
  unions            tagged unions, type switch, Maybe(T)
  data-structures   [dynamic]T, slices, map[K]V
  math              component-wise vectors, matrix[R,C]T, linalg
  strings           string/cstring, Builder, strconv, allocation notes
  terminal          fmt printing + full-screen ANSI board loop
  polymorphism      $T generics, where clauses, proc groups, any
  cli               os.args + core:flags
  resources         vetted docs, book, blogs, codebases

  e.g.  /odin allocators   ·   /odin matrix math   ·   /odin cli

Docs: https://odin-lang.org/docs/overview/
```

If a query matches nothing, print the index and ask which topic.
