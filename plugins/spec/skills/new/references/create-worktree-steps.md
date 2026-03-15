# Create Worktree Steps

Use this bash logic whenever creating a worktree for a plan. Variable names differ slightly between callers — substitute as appropriate (`TARGET_BRANCH` in `/new`, `BRANCH_NAME` in `/worktree create`).

```bash
WORKTREE_PATH=".codevoyant/worktrees/$TARGET_BRANCH"

# Validation: Check if worktree already exists
if git worktree list | grep -q "\[$TARGET_BRANCH\]"; then
  echo "Error: Worktree for branch '$TARGET_BRANCH' already exists"
  echo "Use: git worktree list to see existing worktrees"
  exit 1
fi

# Validation: Check if directory exists
if [ -d "$WORKTREE_PATH" ]; then
  echo "Error: Directory $WORKTREE_PATH already exists"
  exit 1
fi

# Create .codevoyant/worktrees directory if needed
mkdir -p .codevoyant/worktrees

# Check if branch exists
if git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
  # Branch exists, use it
  echo "Using existing branch '$TARGET_BRANCH'"
  git worktree add "$WORKTREE_PATH" "$TARGET_BRANCH"
else
  # Branch doesn't exist, create from base
  echo "Creating new branch '$TARGET_BRANCH' from '$BASE_BRANCH'"
  git worktree add -b "$TARGET_BRANCH" "$WORKTREE_PATH" "$BASE_BRANCH"
fi

# Update .gitignore
if [ -f .gitignore ]; then
  if ! grep -qx "\.codevoyant/worktrees/\?" .gitignore; then
    echo "" >> .gitignore
    echo "# Git worktrees" >> .gitignore
    echo ".codevoyant/worktrees/" >> .gitignore
    echo "✓ Added .codevoyant/worktrees/ to .gitignore"
  fi
else
  echo "# Git worktrees" > .gitignore
  echo ".codevoyant/worktrees/" >> .gitignore
  echo "✓ Created .gitignore with .codevoyant/worktrees/ entry"
fi

echo "✓ Worktree created at $WORKTREE_PATH"
# Store for metadata
PLAN_WORKTREE="$WORKTREE_PATH"
```

**Error handling:**
- Worktree already exists → show error and exit
- Directory collision → show error and exit
- Git commands fail → propagate error
