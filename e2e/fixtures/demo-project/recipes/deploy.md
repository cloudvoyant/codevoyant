---
type: recipe
tags: [deployment, staging]
description: How to deploy to staging
status: active
---

# Deploy to Staging

1. Build the project: `pnpm build`
2. Run tests: `pnpm test`
3. Push to staging branch: `git push origin staging`
4. Wait for CI to pass
5. Verify at https://staging.example.com
