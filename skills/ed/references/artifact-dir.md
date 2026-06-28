# Resolving the artifact directory (shared by all ed workflows)

All ed artifacts default under `.codevoyant/`. Override with `--dir <path>`.

## Resolve

```bash
ART_ROOT=".codevoyant"
# if --dir <path> present in REMAINING_ARGS:
ART_ROOT="<path from --dir>"
```

## Paths

| Kind     | Path                                   | File         |
|----------|----------------------------------------|--------------|
| notes    | `{ART_ROOT}/notes/{slug}/`             | `notes.md`   |
| guides   | `{ART_ROOT}/guides/{slug}/`            | `guide.md`   |
| syllabus | `{ART_ROOT}/syllabus/{slug}/`          | `syllabus.md`|
| quizzes  | `{ART_ROOT}/quizzes/{slug}/`           | `quiz.md` + `answers.md` |

`{slug}` = kebab-case of the topic (lowercase, hyphens for spaces, alphanumeric + hyphens only).

Always `mkdir -p` the directory before writing. When discovering existing artifacts, search under `{ART_ROOT}/...` (default `.codevoyant/...`).
