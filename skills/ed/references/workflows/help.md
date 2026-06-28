# help — ed command reference

Print command reference and exit.

## Output

```
ed — educational learning skill for graduate students

Usage:
  /ed new notes    <topic> [--resources <files...>] [--level grad|undergrad] [--syllabus <file>] [--dir <path>]
  /ed new guide    <topic> [--vim] [--syllabus <file>] [--dir <path>]
  /ed new syllabus <topic> [--syllabus <file>] [--weeks <n>] [--dir <path>]
  /ed update [<file>]
  /ed assist <guide-file> [--vim]
  /ed quiz   <topic>      [--source <file>] [--questions <n>] [--interactive <quiz-file>] [--dir <path>]

Subcommands:
  new notes     Read lecture slides + deep research → Feynman-style notes with diagrams + Q&A
  new guide     Break an assignment into pedagogical phases with hint-controlled disclosure
  new syllabus  Week-by-week learning syllabus; follows a source syllabus if provided
  update        Apply > (minor) and >> (major) annotations from any ed artifact in-place
  assist        Interactive step-by-step walkthrough of a guide with AskUserQuestion hint levels
  quiz          Generate quiz.md + answers.md; --interactive administers an existing quiz

Output directories (default root .codevoyant, override with --dir):
  .codevoyant/notes/{slug}/notes.md
  .codevoyant/guides/{slug}/guide.md
  .codevoyant/syllabus/{slug}/syllabus.md
  .codevoyant/quizzes/{slug}/quiz.md + answers.md

Per-entry fan-out:
  /ed new notes "{course}" --syllabus .codevoyant/syllabus/{course}/syllabus.md
  → one notes artifact per syllabus entry (never combined)

Examples:
  /ed new notes "variational autoencoders" --resources slides/lec5.pdf papers/kingma-vae.pdf
  /ed new guide "assignment 2 - implement a VAE" --vim
  /ed new syllabus "Stanford CS231n" --syllabus syllabus.pdf
  /ed assist .codevoyant/guides/assignment-2-vae/guide.md
  /ed quiz "backpropagation" --source .codevoyant/notes/backprop/notes.md --questions 15
  /ed quiz --interactive .codevoyant/quizzes/backprop/quiz.md
```
