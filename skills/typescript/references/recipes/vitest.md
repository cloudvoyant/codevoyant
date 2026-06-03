# Unit and E2E Testing with Vitest

## Why this matters

Most test setups make a hidden mistake: tests run against the built `dist/` output, not the TypeScript source. This means a failing test might be a stale build, not a real bug — and a passing test proves nothing if you forgot to rebuild. This recipe wires Vitest to resolve workspace packages to their TypeScript source directly (using the `dev` export condition), so tests always run against live code.

The second issue with test suites is undifferentiated slowness: unit tests (milliseconds) and e2e tests (minutes) run together, so every change waits for the full suite. Named projects and tags let you slice runs precisely.

**Prerequisites:** a pnpm workspace (see `pnpm-workspace.md`). If your libs use the `dev`/`default` conditional-exports pattern, the config below makes tests hit TS source automatically.


## 1. Pin Vitest in the catalog and install

Pin the version once in `pnpm-workspace.yaml` so all packages use the same Vitest:

```yaml
catalog:
  vitest: ^4.1.5
```

Then add it to the package that needs tests:

```bash
pnpm --filter @acme/math add -D vitest
```


## 2. Lay out tests by type

Separate unit and integration tests into distinct directories — this maps directly to named projects and lets you run each tier independently:

```
libs/math/
  src/index.ts
  tests/
    unit/uom.test.ts
    integration/pipeline.test.ts
  vitest.config.ts
```


## 3. Per-package `vitest.config.ts`

The most important line is `resolve: { conditions: ["dev"] }`. This tells Vitest to activate the `dev` export condition, which makes workspace package imports resolve to TypeScript source (`src/index.ts`) instead of the built `dist/`. No rebuild needed between code changes and test runs.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace deps to TS source, not built dist — tests always run live code
  resolve: { conditions: ["dev"] },
  ssr: { resolve: { conditions: ["dev"] } }, // also applies during SSR module transforms
  test: {
    env: {
      PUBLIC_LOG_LEVEL: "fatal",
      PRIVATE_APP_VERSION: "1.2.3",
    },
    tags: [
      { name: "fast", description: "These tests should run quickly" },
      { name: "slow", description: "These tests take much longer to complete" },
    ],
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "integration", include: ["tests/integration/**/*.test.ts"] } },
    ],
  },
});
```

`extends: true` in each project inherits the top-level config (including `resolve.conditions`), so you only specify what differs per project.


## 4. Write a test and tag it

Tags let you run only "fast" tests locally and the full suite in CI:

```ts
import { describe, expect, it } from "vitest";
import { add } from "../../src/index";

describe("add()", { tags: ["fast"] }, () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```


## 5. Mocking: `vi.fn`, `vi.mock`, `vi.spyOn`

Three tools for different situations:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import * as db from "../../src/db";
import { createUser } from "../../src/users";

// vi.mock: hoisted — replaces the entire module before any import resolves.
// Use when the module always needs to be mocked in this test file.
vi.mock("../../src/db", () => ({
  insertUser: vi.fn(async () => ({ id: "u_1" })),
}));

describe("createUser", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls db.insertUser with normalized email", async () => {
    const u = await createUser({ email: "  Foo@BAR.com  " });
    expect(db.insertUser).toHaveBeenCalledWith({ email: "foo@bar.com" });
    expect(u.id).toBe("u_1");
  });

  // vi.spyOn: wraps an existing method — the real module stays in place.
  // Use when you want to observe or temporarily override one method.
  it("can spy on an existing method without replacing the module", () => {
    const spy = vi.spyOn(db, "insertUser").mockResolvedValueOnce({ id: "u_2" });
    // ...exercise code that calls db.insertUser...
    expect(spy).toHaveBeenCalled();
  });

  // vi.fn: creates a standalone stub with no module backing.
  // Use for callbacks, event handlers, or injected dependencies.
  it("makes ad-hoc stubs with vi.fn", () => {
    const onEvent = vi.fn();
    onEvent("ready");
    expect(onEvent).toHaveBeenCalledWith("ready");
  });
});
```


## 6. Coverage and UI

```bash
pnpm add -Dw @vitest/coverage-v8 @vitest/ui

# Run with coverage report
pnpm --filter @acme/math exec vitest run --coverage

# Interactive UI (see test results, coverage map, and re-run on demand)
pnpm exec vitest --ui
```


## 7. Package and workspace scripts

At the package level, expose both slice-by-project and slice-by-tag commands:

```jsonc
"scripts": {
  "test": "vitest --project unit --project integration",
  "test:fast": "vitest --tags-filter=fast",
  "test:slow": "vitest --tags-filter=slow",
  "test:e2e": "vitest run --project e2e",
  "type-check": "tsc --noEmit"
}
```

At the workspace root, fan out across all packages:

```jsonc
"scripts": {
  "test": "pnpm -r --if-present test",
  "test:e2e": "pnpm -r --if-present test:e2e"
}
```

`--if-present` skips packages that don't have the script — no error, just skipped.


## Variant: single root config for small repos

Small repos can skip per-package configs and gather all projects at the root:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    projects: ["packages/*"],
  },
});
```

This works while the repo is simple. Switch to per-package configs when packages have different environments (node vs. browser) or different `resolve.conditions` needs.


## API e2e — real HTTP against a running server

For end-to-end API tests, run your server and hit it over HTTP. This catches issues that in-process test clients miss (routing, middleware, real serialization). Give e2e tests their own project with relaxed timeouts and sequential execution:

```ts
projects: [
  { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
  { extends: true, test: { name: "integration", include: ["tests/integration/**/*.test.ts"] } },
  {
    extends: true,
    test: {
      name: "e2e",
      include: ["tests/e2e/**/*.test.ts"],
      testTimeout: 60 * 60 * 1000, // 60 minutes — long-running API scenarios
      hookTimeout: 60 * 1000,
      fileParallelism: false,       // run e2e files sequentially to avoid port conflicts
      bail: 1,                       // stop on first failure — no point continuing after infra breaks
    },
  },
],
```

Gate on required env in `beforeAll` so tests fail loudly with a clear message, not a confusing connection error:

```ts
beforeAll(() => {
  if (!process.env.PRIVATE_BACKEND_URI) {
    throw new Error("PRIVATE_BACKEND_URI must be set for E2E tests");
  }
});
```


## Browser e2e with Playwright

### 1. Install

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

### 2. `playwright.config.ts`

`webServer` builds the app and starts the preview server before the suite runs. Playwright waits for the port, runs specs, then tears it down. `reuseExistingServer: !process.env.CI` means local runs reuse a running dev server (faster), CI always starts fresh (reproducible).

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm run build && pnpm run preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry", // captures a trace on the first retry so you can replay failures
  },
});
```

### 3. Auth: save state once, reuse across tests

Running login in every test wastes time. Save auth state once in global setup and share it:

```ts
// e2e/global-setup.ts
import { chromium, type FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:4173/login");
  await page.fill("input[name=email]", "test@example.com");
  await page.fill("input[name=password]", "secret");
  await page.click("button[type=submit]");
  await page.context().storageState({ path: "e2e/.auth/user.json" });
  await browser.close();
}
```

```ts
// playwright.config.ts — reference global setup and apply auth state to all tests
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  use: { storageState: "e2e/.auth/user.json" },
  // ...
});
```

Override per test when you need a different user role:

```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

test("admin can access /admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("h1")).toContainText("Admin");
});
```

### 4. A simple spec

```ts
import { expect, test } from "@playwright/test";

test("home page renders an h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
```

### 5. Run

```bash
pnpm test:e2e
pnpm exec playwright test --ui   # interactive mode — replay failures, inspect DOM snapshots
```


## Conventions to keep

- Pin Vitest in the workspace catalog. Add `@vitest/coverage-v8` and `@vitest/ui` at the workspace root so they're available everywhere.
- Always set `resolve: { conditions: ["dev"] }` (and matching `ssr.resolve`) so tests run against workspace TypeScript source, never stale `dist/`.
- Split tests into `tests/unit`, `tests/integration`, `tests/e2e` and map each to a named project with `extends: true`.
- Declare tags in config; attach with `describe("…", { tags: ["fast"] }, …)`; slice with `--tags-filter=`.
- `pnpm -r --if-present test` is the standard workspace-wide test entrypoint.
- API e2e: real HTTP, long timeouts, `fileParallelism: false`, `bail: 1`.
- Browser e2e: Playwright with `webServer` + `testDir: "e2e"`. Share auth via `storageState`.
