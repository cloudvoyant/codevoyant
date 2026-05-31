# feedback

Open a GitHub or GitLab issue to report a problem with a codevoyant skill, or save the report as a markdown file under `.codevoyant/feedback/` if you can't create an issue right now.

## Arguments

- `[skill-name]` (optional positional): The skill that had the problem (e.g. `spec`, `dev`, `sveltekit`). If omitted, ask the user.
- `--save`: Skip issue creation and write the report to `.codevoyant/feedback/{skill}-{timestamp}.md` instead.
- `--github` / `--gitlab`: Override auto-detected provider.
- `--repo <url>`: Override the target repo (default: `https://github.com/cloudvoyant/codevoyant`).

## Step 0: Parse Arguments

```bash
SKILL_NAME="[first non-flag positional arg, or empty]"
PROVIDER=""   # auto-detect from remote URL
REPO="https://github.com/cloudvoyant/codevoyant"
SAVE=false

[[ "$*" =~ --save ]]   && SAVE=true
[[ "$*" =~ --github ]] && PROVIDER="github"
[[ "$*" =~ --gitlab ]] && PROVIDER="gitlab"
# extract --repo <url> if present
```

## Step 1: Resolve skill name

If `SKILL_NAME` is empty, ask:

> Which skill had the problem? (e.g. `spec`, `dev`, `sveltekit`, `mise`)

## Step 2: Detect provider (skip if `--save`)

If `SAVE=true`, skip to Step 3 — no provider needed.

If `PROVIDER` is not set via flag:

```bash
git remote get-url origin  # → REMOTE_URL
```

- URL contains `github.com` → `PROVIDER=github`
- URL contains `gitlab.com` or `gitlab.` → `PROVIDER=gitlab`

If provider cannot be determined, default to `github` and note this to the user.

## Step 3: Gather context

Ask the user:

> Briefly describe what went wrong and what you expected instead.

Then collect:

```bash
# Skill version (from installed skill if available)
cat ~/.claude/skills/${SKILL_NAME}/SKILL.md 2>/dev/null | grep "^version:" | head -1

# Platform
echo "Platform: $(uname -s) $(uname -m)"

# Claude Code version (if available)
claude --version 2>/dev/null || echo "unknown"
```

## Step 4: Draft issue

Compose the issue using this template:

```markdown
## Skill

`/{SKILL_NAME}`

## What happened

{USER_DESCRIPTION}

## What I expected

{Ask the user for expected behaviour if not already clear from the description}

## Steps to reproduce

{Ask the user: "What did you type / what was the context?" — keep it brief}

## Environment

- Platform: {uname output}
- Claude Code: {version}
- Skill version: {version or "unknown"}
```

Title: `[{SKILL_NAME}] {short one-line summary from user description}`

## Step 5: Confirm and create

Show the draft title and body for review.

### If `--save` is set

Write the report to `.codevoyant/feedback/`:

```bash
mkdir -p .codevoyant/feedback
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE=".codevoyant/feedback/${SKILL_NAME}-${TIMESTAMP}.md"
```

File format:

```markdown
# Feedback: [{SKILL_NAME}] {TITLE}

> Saved {ISO timestamp}. Open an issue at https://github.com/cloudvoyant/codevoyant/issues/new when ready.

{BODY}
```

Confirm the file path written and remind the user they can share it later.

### Otherwise — create the issue

**GitHub:**

```bash
gh issue create \
  --repo cloudvoyant/codevoyant \
  --title "{TITLE}" \
  --body "{BODY}" \
  --label "skill-feedback"
```

**GitLab:**

```bash
glab issue create \
  --repo cloudvoyant/codevoyant \
  --title "{TITLE}" \
  --description "{BODY}" \
  --label "skill-feedback"
```

Report the issue URL on success.

If `gh` / `glab` is not installed, automatically fall back to `--save` behaviour and inform the user:

```
✗ GitHub CLI (gh) not found — saving report locally instead.
  Install gh: https://cli.github.com

  Report saved to: .codevoyant/feedback/{SKILL_NAME}-{TIMESTAMP}.md
  Open an issue at: https://github.com/cloudvoyant/codevoyant/issues/new
```
