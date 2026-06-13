# help — ed command reference

Print command reference and exit.

## Output

```
ed — educational learning skill for graduate students

Usage:
  /ed new notes <topic> [--resources <files...>] [--level grad|undergrad]
  /ed new guide <topic> [--vim] [--helix]
  /ed new plan  <topic> [--syllabus <file>] [--weeks <n>]
  /ed update [<file>]
  /ed assist <guide-file> [--vim] [--helix]
  /ed quiz   <topic>     [--source <file>] [--questions <n>] [--interactive <quiz-file>]

Subcommands:
  new notes   Read lecture slides + deep research → Feynman-style notes with diagrams + Q&A
  new guide   Break an assignment into pedagogical phases with hint-controlled disclosure
  new plan    Week-by-week learning plan; follows syllabus if provided
  update      Apply > (minor) and >> (major) annotations from any ed artifact in-place
  assist      Interactive step-by-step walkthrough of a guide with AskUserQuestion hint levels
  quiz        Generate quiz.md + answers.md; --interactive administers an existing quiz

Output directories (relative to cwd):
  notes/{slug}/notes.md
  guides/{slug}/guide.md
  plans/{slug}/plan.md
  quizzes/{slug}/quiz.md + quizzes/{slug}/answers.md

Examples:
  /ed new notes "variational autoencoders" --resources slides/lec5.pdf papers/kingma-vae.pdf
  /ed new guide "assignment 2 - implement a VAE" --vim
  /ed new plan "Stanford CS231n" --syllabus syllabus.pdf
  /ed assist guides/assignment-2-vae/guide.md
  /ed quiz "backpropagation" --source notes/backprop/notes.md --questions 15
  /ed quiz --interactive quizzes/backprop/quiz.md
```
