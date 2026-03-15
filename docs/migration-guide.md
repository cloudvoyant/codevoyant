# Migration Guide: Spec Plugin v2.0

## Breaking Change: Multi-Plan Architecture

Version 2.0 of the spec plugin introduces a new multi-plan architecture. Plans are now stored in `.codevoyant/plans/` instead of `.claude/plan.md`.

## What Changed

**Before (v1.x):**
```
.claude/
└── plan.md              # Single plan file
```

**After (v2.0):**
```
.codevoyant/
├── spec.json            # Plan registry and variables
└── plans/
    ├── my-plan/
    │   ├── plan.md
    │   ├── implementation/     # NEW: Per-phase specs
    │   │   ├── phase-1.md
    │   │   └── phase-2.md
    │   └── execution-log.md
    └── archive/
```

## Migration Steps

If you have an existing `.claude/plan.md`, follow these steps:

### Step 1: Choose a Plan Name

Decide what to call your plan. Use a descriptive slug like:
- `add-authentication`
- `refactor-api-layer`
- `implement-feature-x`

### Step 2: Create New Plan Structure

```bash
# Create directories
mkdir -p .codevoyant/plans/your-plan-name/implementation

# Move your plan
mv .claude/plan.md .codevoyant/plans/your-plan-name/plan.md

# Move execution log if it exists
mv .claude/execution-log.md .codevoyant/plans/your-plan-name/execution-log.md 2>/dev/null || true
```

**Important:** If your old plan.md contains detailed implementation sections, consider splitting them into separate phase files:
- Extract implementation details for each phase
- Create `implementation/phase-1.md`, `phase-2.md`, etc.
- Keep only high-level objectives and task checklists in plan.md

### Step 3: Initialize spec.json

Create `.codevoyant/spec.json`:

```json
{
  "version": "1.0",
  "activePlans": [
    {
      "name": "your-plan-name",
      "description": "Brief description from your plan",
      "status": "Active",
      "progress": { "completed": 0, "total": 10 },
      "created": "2025-01-01T00:00:00Z",
      "lastUpdated": "2025-01-01T00:00:00Z",
      "path": ".codevoyant/plans/your-plan-name/",
      "branch": null,
      "worktree": null
    }
  ],
  "archivedPlans": []
}
```

### Step 4: Update .gitignore

Update your `.gitignore`:

```
# Remove old entries
- .claude/plan.md
- .claude/execution-log.md

# Add new entries
+ .codevoyant/plans/*/plan.md
+ .codevoyant/plans/*/implementation/
+ .codevoyant/plans/*/execution-log.md
+ .codevoyant/plans/archive/
+ !.codevoyant/spec.json
```

### Step 5: Use New Commands

All commands now accept plan names:

```bash
# Execute your plan
/go your-plan-name

# Check status
/status your-plan-name

# List all plans
/list
```

## Automated Migration (Future)

We plan to add an automated migration command in a future release:
```bash
/migrate    # Auto-detects .claude/plan.md and migrates
```

## Need Help?

If you encounter issues during migration:
- Check that your plan.md is in the correct directory
- Ensure spec.json is valid JSON
- Try `/list` to see if your plan is detected

For questions: https://github.com/codevoyant/codevoyant/issues
