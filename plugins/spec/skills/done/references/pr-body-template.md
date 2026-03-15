# PR Body Template

Use this markdown body when creating a pull request via `gh pr create` in Step 3.5. Substitute all `{...}` placeholders with actual values.

```markdown
## Summary
[Plan objective — 2-3 bullet points]

## Implementation
This PR implements the plan defined in `.codevoyant/plans/{plan-name}/plan.md`

**Completed:**
- All {N} phases complete
- {M} tasks completed
- Tests passing ✅

## Plan Details
- Plan: {plan-name}
- Branch: {PLAN_BRANCH}
- Base: {BASE_BRANCH}

See `.codevoyant/plans/{plan-name}/plan.md` for full implementation details.

🤖 Generated with Claude Code /spec:done
```

**gh CLI command:**
```bash
gh pr create \
  --base "$BASE_BRANCH" \
  --head "$PLAN_BRANCH" \
  --title "feat: {plan objective summary}" \
  --body "$(cat <<'EOF'
[paste rendered template above]
EOF
)"
```
